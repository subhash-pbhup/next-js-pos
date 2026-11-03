import mongoose from "mongoose";
const billSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  items: { type: Array, required: true },
  subTotal: { type: Number, required: true },
  totalTax: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, required: true, default: "Cash" }, // Naya field
  date: { type: Date, default: Date.now },
});
export default mongoose.models.Bill || mongoose.model("Bill", billSchema);
