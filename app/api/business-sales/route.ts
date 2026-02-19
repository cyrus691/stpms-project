import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getBusinessSaleModel } from "@/lib/models/BusinessSale";
import { getInventoryItemModel } from "@/lib/models/InventoryItem";
import { getUserModel } from "@/lib/models/User";
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
  if (user.businessId && Types.ObjectId.isValid(user.businessId)) return user.businessId;
  if (user.id && Types.ObjectId.isValid(user.id)) return user.id;
  return null;
}

// Helper: validates tenant and ensures it's a business
async function validateTenant(sessionUser: SessionUser, UserModel: ReturnType<typeof getUserModel>) {
  const tenantId = getTenantId(sessionUser);
  if (!tenantId) return null;
  const dbUser = await UserModel.findById(tenantId).select("role").lean();
  if (!dbUser || dbUser.role !== "business") return null;
  return tenantId;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const conn = await getConnection();
    const User = getUserModel(conn);
    const BusinessSale = getBusinessSaleModel(conn);

    const tenantId = await validateTenant(session.user as SessionUser, User);
    if (!tenantId) return NextResponse.json({ error: "Business user required" }, { status: 403 });

    const sales = await BusinessSale.find({ userId: tenantId })
      .sort({ saleDate: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(sales, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const conn = await getConnection();
    const User = getUserModel(conn);
    const BusinessSale = getBusinessSaleModel(conn);
    const InventoryItem = getInventoryItemModel(conn);

    const tenantId = await validateTenant(session.user as SessionUser, User);
    if (!tenantId) return NextResponse.json({ error: "Business user required" }, { status: 403 });

    const body = await request.json();
    const { productId, productName, quantity, unitPrice, customerName, saleType, paymentMethod, saleDate, dueDate, status, creditorEmail } = body;

    // Basic validation
    if (!quantity || !saleType || !saleDate) {
      return NextResponse.json({ error: "quantity, saleType, saleDate required" }, { status: 400 });
    }
    if (!['cash', 'credit'].includes(saleType)) return NextResponse.json({ error: "Valid saleType required" }, { status: 400 });
    if (paymentMethod && !["cash", "card", "bank_transfer", "other"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Valid paymentMethod required" }, { status: 400 });
    }

    let resolvedProductName = productName?.trim() || "";
    let resolvedUnitPrice = Number(unitPrice) || 0;

    if (productId) {
      if (!Types.ObjectId.isValid(productId)) return NextResponse.json({ error: "Valid productId required" }, { status: 400 });
      const item = await InventoryItem.findOne({ _id: productId, userId: tenantId }).lean();
      if (!item) return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
      if (Number(quantity) > item.quantityInStock) return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });

      resolvedProductName = item.name;
      resolvedUnitPrice = typeof item.sellingPrice === "number" ? item.sellingPrice : item.unitPrice;

      // Tenant-safe inventory update
      await InventoryItem.findOneAndUpdate(
        { _id: productId, userId: tenantId },
        { $inc: { quantityInStock: -Number(quantity) } }
      );
    }

    if (!resolvedProductName) return NextResponse.json({ error: "productName required" }, { status: 400 });
    if (!resolvedUnitPrice || resolvedUnitPrice <= 0) return NextResponse.json({ error: "unitPrice required" }, { status: 400 });

    const totalAmount = Number(quantity) * resolvedUnitPrice;

    const sale = await BusinessSale.create({
      productId: productId && Types.ObjectId.isValid(productId) ? productId : undefined,
      productName: resolvedProductName,
      quantity: Number(quantity),
      unitPrice: resolvedUnitPrice,
      totalAmount,
      customerName: customerName?.trim(),
      saleType,
      paymentMethod: saleType === "cash" ? paymentMethod : undefined,
      saleDate: new Date(saleDate),
      dueDate: saleType === "credit" && dueDate ? new Date(dueDate) : null,
      status: saleType === "credit" ? (status ?? "pending") : "paid",
      userId: tenantId,
      creditorEmail: saleType === "credit" && creditorEmail ? creditorEmail.trim() : undefined
    });

    return NextResponse.json(sale, { status: 201, headers: { "Cache-Control": "no-store" } });

  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
  }
}
