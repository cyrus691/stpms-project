import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IExpense extends Document {
  label: string;
  amount: number;
  occurredOn: Date;
  category?: string;
  userId?: Types.ObjectId;
  createdAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
    occurredOn: { type: Date, default: Date.now },
    category: { type: String, default: 'General' },
    userId: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const getExpenseModel = (conn: Connection): Model<IExpense> => {
  if (conn.models.Expense) {
    return conn.models.Expense as Model<IExpense>;
  }
  return conn.model<IExpense>("Expense", expenseSchema);
};
