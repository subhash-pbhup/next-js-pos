import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "../../../lib/mongodb";
import Product from "../../../models/Product";

// Yahan humne explicitly collection ka naam 'orders' set kar diya hai
const OrderSchema = new mongoose.Schema(
  {
    customerName: { type: String, default: "Walk-in" },
    customerPhone: { type: String, default: "" },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        variantId: { type: String, default: null },
        name: String,
        price: Number,
        costPrice: Number,
        qty: Number,
        effectiveQty: Number,
        unit: String,
        gst: Number,
        category: String,
        barcode: String,
        returnedQty: { type: Number, default: 0 } 
      },
    ],
    subTotal: { type: Number, required: true },
    totalTax: { type: Number, default: 0 },
    customFees: [{ name: String, amount: Number }],
    discountAmount: { type: Number, default: 0 },
    roundOffAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMode: { type: String, required: true },
    transactionId: { type: String, default: null },
    couponCode: { type: String, default: null },
    cashReceived: { type: Number, default: 0 },
    changeToReturn: { type: Number, default: 0 },
    date: { type: String },
    // Return tracking fields
    isReturned: { type: Boolean, default: false },
    isPartiallyReturned: { type: Boolean, default: false },
    refundedAmount: { type: Number, default: 0 },
    returnedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: 'orders' } // 👈 Naye orders ab directly 'orders' collection me jayenge
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

// Purane bills ko read karne ke liye temporary flexible schema
const FlexibleBillSchema = new mongoose.Schema({}, { strict: false, collection: 'bills' });
const Bill = mongoose.models.Bill || mongoose.model("Bill", FlexibleBillSchema);

export async function GET() {
  await dbConnect();
  try {
    // UI me history dikhane ke liye hum 'orders' aur 'bills' dono table se data nikal kar merge kar rahe hain
    const orders = await Order.find({}).lean();
    const bills = await Bill.find({}).lean();

    // Dono ko combine karke latest date ke hisaab se sort karenge
    const allTransactions = [...orders, ...bills].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ success: true, data: allTransactions });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart me koi items nahi hain!" }, { status: 400 });
    }

    // Stock Auto Deduction Loop for Variants & Normal Products
    for (const item of items) {
      const cleanProductId = String(item.productId || item._id).split("_")[0];
      const qtyToDeduct = Number(item.effectiveQty ?? item.qty) || 0;

      if (!mongoose.Types.ObjectId.isValid(cleanProductId)) continue;

      const product = await Product.findById(cleanProductId);
      if (!product) continue;

      if (item.variantId && product.hasVariants && Array.isArray(product.variants)) {
        const vIndex = product.variants.findIndex(
          (v) =>
            v.sku === item.variantId ||
            `${v.color}_${v.size}` === item.variantId ||
            String(item._id).includes(v.sku)
        );

        if (vIndex !== -1) {
          const currentVarStock = Number(product.variants[vIndex].stock) || 0;
          product.variants[vIndex].stock = Math.max(0, currentVarStock - qtyToDeduct);
          
          product.stock = product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
          await product.save();
        } else {
          product.stock = Math.max(0, (Number(product.stock) || 0) - qtyToDeduct);
          await product.save();
        }
      } else {
        product.stock = Math.max(0, (Number(product.stock) || 0) - qtyToDeduct);
        await product.save();
      }
    }

    // Naya order banayenge jo seedha 'orders' collection me save hoga
    const newOrder = await Order.create(body);
    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error) {
    console.error("Checkout Stock Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Checkout failed" }, { status: 500 });
  }
}