import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getInventoryItemModel } from "@/lib/models/InventoryItem";
import { getUserModel } from "@/lib/models/User";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { name, sku, unitPrice, sellingPrice, quantityInStock, userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (typeof name === "string") updateFields.name = name.trim();
    if (typeof sku === "string") updateFields.sku = sku.trim() || undefined;
    if (typeof unitPrice === "number") updateFields.unitPrice = unitPrice;
    if (typeof sellingPrice === "number") updateFields.sellingPrice = sellingPrice;
    if (typeof quantityInStock === "number") updateFields.quantityInStock = quantityInStock;

    const conn = await getConnection();
    const InventoryItem = getInventoryItemModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "business") {
      return NextResponse.json({ error: "Business user required" }, { status: 403 });
    }

    const existing = await InventoryItem.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updated = await InventoryItem.findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Item id is required" }, { status: 400 });
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const InventoryItem = getInventoryItemModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "business") {
      return NextResponse.json({ error: "Business user required" }, { status: 403 });
    }

    const existing = await InventoryItem.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await InventoryItem.findByIdAndDelete(id).lean();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 });
  }
}