import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "../../../../lib/mongodb";
import Product from "../../../../models/Product";
import Order from "../../../../models/Order";

export async function POST(req) {
  await dbConnect();

  try {
    const { orderId, returnItems } = await req.json();

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order database me nahi mila!" },
        { status: 404 },
      );
    }
    if (order.isReturned) {
      return NextResponse.json(
        { success: false, error: "Poora order pehle hi return ho chuka hai!" },
        { status: 400 },
      );
    }

    let totalRefundThisTime = 0;

    // Perfect Match using Exact Index directly on the Mongoose Document
    for (const retItem of returnItems) {
      const qtyToReturn = Number(retItem.qtyToReturn) || 0;
      if (qtyToReturn <= 0) continue;

      const orderItemIndex = order.items.findIndex((i, idx) => {
        // EXACT POSITION MATCH
        return retItem.index !== undefined && retItem.index === idx;
      });

      if (orderItemIndex === -1) continue;

      const orderItem = order.items[orderItemIndex];
      const previouslyReturned = Number(orderItem.returnedQty) || 0;
      const maxAllowed = Number(orderItem.qty) || 0;

      if (previouslyReturned + qtyToReturn > maxAllowed) {
        throw new Error(
          `Quantity exceeds purchased amount for ${orderItem.name}`,
        );
      }

      const effectiveQtyToReturn =
        orderItem.selectedUnit === "Gram" ? qtyToReturn / 1000 : qtyToReturn;
      const unitPriceWithTax =
        orderItem.price + (orderItem.price * (orderItem.gst || 0)) / 100;
      const exactRefundForItems = unitPriceWithTax * effectiveQtyToReturn;
      totalRefundThisTime += exactRefundForItems;

      // Restore Stock Logic
      const cleanProductId = String(orderItem.productId || orderItem._id).split(
        "_",
      )[0];

      if (mongoose.Types.ObjectId.isValid(cleanProductId)) {
        const product = await Product.findById(cleanProductId);
        if (product) {
          if (
            orderItem.variantId &&
            product.hasVariants &&
            Array.isArray(product.variants)
          ) {
            const vIndex = product.variants.findIndex(
              (v) =>
                v.sku === orderItem.variantId ||
                `${v.color}_${v.size}` === orderItem.variantId ||
                String(orderItem._id).includes(v.sku),
            );
            if (vIndex !== -1) {
              product.variants[vIndex].stock =
                (Number(product.variants[vIndex].stock) || 0) +
                effectiveQtyToReturn;
              product.stock = product.variants.reduce(
                (sum, v) => sum + (Number(v.stock) || 0),
                0,
              );
              await product.save();
            } else {
              product.stock =
                (Number(product.stock) || 0) + effectiveQtyToReturn;
              await product.save();
            }
          } else {
            product.stock = (Number(product.stock) || 0) + effectiveQtyToReturn;
            await product.save();
          }
        }
      }

      // FIX: Mutate the mongoose document object directly
      order.items[orderItemIndex].returnedQty =
        previouslyReturned + qtyToReturn;
    }

    if (totalRefundThisTime === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select at least 1 valid item to return.",
        },
        { status: 400 },
      );
    }

    const newRefundedAmount =
      (Number(order.refundedAmount) || 0) + totalRefundThisTime;

    const totalPurchasedQty = order.items.reduce(
      (sum, i) => sum + Number(i.qty),
      0,
    );
    const totalReturnedQty = order.items.reduce(
      (sum, i) => sum + (Number(i.returnedQty) || 0),
      0,
    );

    if (totalReturnedQty >= totalPurchasedQty) {
      order.isReturned = true;
      order.isPartiallyReturned = false;
    } else {
      order.isPartiallyReturned = true;
      order.isReturned = false;
    }

    order.refundedAmount = newRefundedAmount;
    order.returnedAt = new Date();

    // EXTREMELY IMPORTANT: Tell Mongoose that the nested array has been modified
    order.markModified("items");

    // Save the entire document safely
    await order.save();

    return NextResponse.json({
      success: true,
      message: "Return processed & stock restored successfully!",
      refundAmount: totalRefundThisTime,
    });
  } catch (error) {
    console.error("Return API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
