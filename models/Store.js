import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

if (mongoose.models.Store) {
  delete mongoose.models.Store;
}

export default mongoose.model("Store", storeSchema);
