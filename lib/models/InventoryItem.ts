import { Schema, Document, Connection, Types, Model } from "mongoose";

export interface IInventoryItem extends Document {
  name: string;
  sku?: string;
  unitPrice: number;
  sellingPrice: number;
  quantityInStock: number;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true },
    sku: { type: String },
    unitPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    quantityInStock: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" }
  },
  { timestamps: true, collection: "inventory_items" }
);

export const getInventoryItemModel = (conn: Connection): Model<IInventoryItem> => {
  if (conn.models.InventoryItem) {
    return conn.models.InventoryItem as Model<IInventoryItem>;
  }
  return conn.model<IInventoryItem>("InventoryItem", inventoryItemSchema);
};