import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IPayment {
  amount: number;
  date: Date;
  method: "cash" | "card" | "bank_transfer" | "other";
}

export interface IBusinessSale extends Document {
  productId?: Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName?: string;
  saleType: "cash" | "credit";
  paymentMethod?: "cash" | "card" | "bank_transfer" | "other";
  saleDate: Date;
  dueDate?: Date;
  status: "paid" | "pending";
  userId: Types.ObjectId;
  payments: IPayment[];
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  method: { type: String, enum: ["cash", "card", "bank_transfer", "other"], required: true }
}, { _id: false });

const businessSaleSchema = new Schema<IBusinessSale>({
  productId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  customerName: { type: String },
  saleType: { type: String, enum: ["cash", "credit"], required: true },
  paymentMethod: { type: String, enum: ["cash", "card", "bank_transfer", "other"] },
  saleDate: { type: Date, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ["paid", "pending"], default: "paid" },
  userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  payments: { type: [paymentSchema], default: [] }
}, { timestamps: true, collection: "business_sales" });

businessSaleSchema.virtual("balance").get(function (this: IBusinessSale) {
  const paid = (this.payments || []).reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, this.totalAmount - paid);
});

businessSaleSchema.set("toJSON", { virtuals: true });

export const getBusinessSaleModel = (conn: Connection): Model<IBusinessSale> => {
  if (conn.models.BusinessSale) {
    return conn.models.BusinessSale as Model<IBusinessSale>;
  }
  return conn.model<IBusinessSale>("BusinessSale", businessSaleSchema);
};
