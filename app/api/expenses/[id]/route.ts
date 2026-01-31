import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getExpenseModel } from "@/lib/models/Expense";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json();
  const update: any = {};
  if (body.label !== undefined) update.label = body.label;
  if (body.amount !== undefined) update.amount = body.amount;
  // Always update category if provided, fallback to 'General' if empty string
  if (body.category !== undefined) update.category = body.category || 'General';
  if (body.occurredOn !== undefined) update.occurredOn = new Date(body.occurredOn);
  if (body.userId !== undefined) update.userId = body.userId;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  const conn = await getConnection();
  const Expense = getExpenseModel(conn);
  const updated = await Expense.findByIdAndUpdate(
    id,
    update,
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const conn = await getConnection();
  const Expense = getExpenseModel(conn);
  const deleted = await Expense.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
