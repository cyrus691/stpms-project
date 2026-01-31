import mongoose from "mongoose";

const BusinessInformationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  businessName: { type: String, required: true },
  address: { type: String },
  email: { type: String },
  phone: { type: String },
  taxNumber: { type: String },
}, { timestamps: true });

export default mongoose.models.BusinessInformation || mongoose.model("BusinessInformation", BusinessInformationSchema);
