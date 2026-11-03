import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
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
        returnedQty: { type: Number, default: 0 },
        serialNumber: { type: String, default: null },

        // Ensure Warranty Fields are saved to Mongoose DB
        hasWarranty: { type: Boolean, default: false },
        warrantyMonths: { type: Number, default: 0 },
      },
    ],
    subTotal: { type: Number, required: true },
    totalTax: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMode: { type: String, required: true },
    customFees: { type: Array, default: [] },
    discountAmount: { type: Number, default: 0 },
    roundOffAmount: { type: Number, default: 0 },
    transactionId: { type: String, default: null },
    couponCode: { type: String, default: null },
    cashReceived: { type: Number, default: 0 },
    changeToReturn: { type: Number, default: 0 },
    date: { type: String },

    isReturned: { type: Boolean, default: false },
    isPartiallyReturned: { type: Boolean, default: false },
    refundedAmount: { type: Number, default: 0 },
    returnedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "orders" },
);

if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model("Order", orderSchema);
