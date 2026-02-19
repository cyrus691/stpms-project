import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getBusinessSaleModel } from "@/lib/models/BusinessSale";
import { getUserModel } from "@/lib/models/User";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { productName, quantity, unitPrice, customerName, saleType, paymentMethod, saleDate, dueDate, status, userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Sale id is required" }, { status: 400 });
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (typeof productName === "string") updateFields.productName = productName.trim();
    if (typeof quantity === "number") updateFields.quantity = quantity;
    if (typeof unitPrice === "number") updateFields.unitPrice = unitPrice;
    if (typeof customerName === "string") updateFields.customerName = customerName.trim() || undefined;
    if (saleType && ["cash", "credit"].includes(saleType)) updateFields.saleType = saleType;
    if (paymentMethod && ["cash", "card", "bank_transfer", "other"].includes(paymentMethod)) {
      updateFields.paymentMethod = paymentMethod;
    }
    if (saleDate) updateFields.saleDate = new Date(saleDate);
    if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;
    if (status && ["paid", "pending"].includes(status)) updateFields.status = status;

    if (updateFields.quantity !== undefined || updateFields.unitPrice !== undefined) {
      const quantityValue = Number(updateFields.quantity ?? 0);
      const unitPriceValue = Number(updateFields.unitPrice ?? 0);
      updateFields.totalAmount = quantityValue * unitPriceValue;
    }

    const conn = await getConnection();
    const BusinessSale = getBusinessSaleModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "business") {
      return NextResponse.json({ error: "Business user required" }, { status: 403 });
    }

    const existing = await BusinessSale.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const updated = await BusinessSale.findByIdAndUpdate(id, updateFields, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Sale id is required" }, { status: 400 });
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const conn = await getConnection();
    const BusinessSale = getBusinessSaleModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "business") {
      return NextResponse.json({ error: "Business user required" }, { status: 403 });
    }

    const existing = await BusinessSale.findById(id).lean();
    if (!existing || existing.userId?.toString() !== String(userId)) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await BusinessSale.findByIdAndDelete(id).lean();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 });
  }
}
