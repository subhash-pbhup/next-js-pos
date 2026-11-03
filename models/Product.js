import mongoose from "mongoose";

if (process.env.NODE_ENV !== "production" && mongoose.models.Product) {
  delete mongoose.models.Product;
}

const VariantSchema = new mongoose.Schema(
  {
    sku: { type: String, default: "" },
    color: { type: String, default: "" },
    size: { type: String, default: "" },
    price: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    image: { type: String, default: "" },
  },
  { _id: false },
);

const ProductSchema = new mongoose.Schema(
  {
    barcode: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: "" },
    subcategory: { type: String, default: "" },
    price: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    unit: { type: String, default: "Pcs" },
    gst: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    image: { type: String, default: "" },
    deleted: { type: Boolean, default: false },
    hasVariants: { type: Boolean, default: false },
    variants: { type: [VariantSchema], default: [] },

    // Electronics / Warranty Fields
    hasWarranty: { type: Boolean, default: false },
    warrantyMonths: { type: Number, default: 0 },

    // Yahan Pharmacy / Medical Fields Add Kiye Hain:
    batchNumber: { type: String, default: "" },
    expiryDate: { type: String, default: "" },

    // Store Linking
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
