import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password save hoga
    role: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Cashier"],
      default: "Cashier",
    },
    assignedStores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Store" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model("User", userSchema);
