import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getExpenseModel } from "@/lib/models/Expense";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const conn = await getConnection();
    const Expense = getExpenseModel(conn);
    const filter: any = {};
    if (userId) {
      filter.userId = userId;
    }
    const expenses = await Expense.find(filter)
      .sort({ occurredOn: -1 })
      .limit(100)
      .lean()
      .exec();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { label, amount, occurredOn, category, userId } = await request.json();
  if (!label || !amount) {
    return NextResponse.json({ error: "label and amount required" }, { status: 400 });
  }
  const conn = await getConnection();
  const Expense = getExpenseModel(conn);
  const expense = await Expense.create({
    label,
    amount,
    occurredOn: occurredOn ? new Date(occurredOn) : new Date(),
    category: category || 'General',
    ...(userId ? { userId } : {})
  });
  return NextResponse.json(expense, { status: 201 });
}
