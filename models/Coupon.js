import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },
    discountValue: { type: Number, required: true },
    applyOn: {
      type: String,
      enum: ["all", "category", "subcategory", "product"],
      required: true,
    },
    targetName: { type: String, default: "" }, // Category Name, Subcategory Name, or Product Barcode/Name
    minOrderAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

if (mongoose.models.Coupon) {
  delete mongoose.models.Coupon;
}

export default mongoose.model("Coupon", couponSchema);
