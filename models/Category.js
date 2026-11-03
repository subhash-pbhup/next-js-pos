import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    subcategories: [{ type: String }], // List of subcategory names
  },
  { timestamps: true },
);

if (mongoose.models.Category) {
  delete mongoose.models.Category;
}

export default mongoose.model("Category", categorySchema);
