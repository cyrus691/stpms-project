import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getExpenseModel } from "@/lib/models/Expense";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface SessionUser {
  id?: string;
  businessId?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function getTenantId(user: SessionUser): string | null {
  if (user.businessId) return user.businessId;
  if (user.id) return user.id;
  return null;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const user = session.user as SessionUser;
    const tenantId = getTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    // Use userId parameter if provided, otherwise use session tenantId
    const filterUserId = userIdParam || tenantId;
    
    const conn = await getConnection();
    const Expense = getExpenseModel(conn);
    const filter: Record<string, unknown> = { userId: filterUserId };
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
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const user = session.user as SessionUser;
    const tenantId = getTenantId(user);
    if (!tenantId) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }
    const { label, amount, occurredOn, category } = await request.json();
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
      userId: tenantId
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
