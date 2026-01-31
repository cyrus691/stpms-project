import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getBusinessSaleModel } from "@/lib/models/BusinessSale";
import { getInventoryItemModel } from "@/lib/models/InventoryItem";
import { getUserModel } from "@/lib/models/User";

export async function GET(request: Request) {
  try {
    const conn = await getConnection();
    const BusinessSale = getBusinessSaleModel(conn);
    const User = getUserModel(conn);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const filter: Record<string, unknown> = {};
    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
      const user = await User.findById(userId).select("role").lean();
      if (!user || user.role !== "business") {
        return NextResponse.json({ error: "Business user required" }, { status: 403 });
      }
      filter.userId = userId;
    }

    const sales = await BusinessSale.find(filter)
      .sort({ saleDate: -1 })
      .limit(200)
      .lean()
      .exec();

    return NextResponse.json(sales, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { productId, productName, quantity, unitPrice, customerName, saleType, paymentMethod, saleDate, dueDate, status, userId } = await request.json();
  if (!quantity || !saleType || !saleDate || !userId) {
    return NextResponse.json({ error: "quantity, saleType, saleDate, userId required" }, { status: 400 });
  }
  if (!Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
  }
  if (!['cash', 'credit'].includes(saleType)) {
    return NextResponse.json({ error: "Valid saleType required" }, { status: 400 });
  }
  if (paymentMethod && !["cash", "card", "bank_transfer", "other"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Valid paymentMethod required" }, { status: 400 });
  }

  const conn = await getConnection();
  const BusinessSale = getBusinessSaleModel(conn);
  const InventoryItem = getInventoryItemModel(conn);
  const User = getUserModel(conn);
  const user = await User.findById(userId).select("role").lean();
  if (!user || user.role !== "business") {
    return NextResponse.json({ error: "Business user required" }, { status: 403 });
  }

  let resolvedProductName = productName ? String(productName).trim() : "";
  let resolvedUnitPrice = Number(unitPrice);
  if (productId) {
    if (!Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Valid productId required" }, { status: 400 });
    }
    const item = await InventoryItem.findOne({ _id: productId, userId }).lean();
    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }
    if (Number(quantity) > item.quantityInStock) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }
    resolvedProductName = item.name;
    resolvedUnitPrice = Number(item.sellingPrice ?? item.unitPrice);
    await InventoryItem.findByIdAndUpdate(productId, { $inc: { quantityInStock: -Number(quantity) } }).lean();
  }

  if (!resolvedProductName) {
    return NextResponse.json({ error: "productName required" }, { status: 400 });
  }
  if (!resolvedUnitPrice || resolvedUnitPrice <= 0) {
    return NextResponse.json({ error: "unitPrice required" }, { status: 400 });
  }

  const totalAmount = Number(quantity) * Number(resolvedUnitPrice);
  const sale = await BusinessSale.create({
    productId: productId && Types.ObjectId.isValid(productId) ? productId : undefined,
    productName: resolvedProductName,
    quantity: Number(quantity),
    unitPrice: Number(resolvedUnitPrice),
    totalAmount,
    customerName: customerName ? String(customerName).trim() : undefined,
    saleType,
    paymentMethod: saleType === "cash" ? paymentMethod : undefined,
    saleDate: new Date(saleDate),
    dueDate: saleType === "credit" && dueDate ? new Date(dueDate) : null,
    status: saleType === "credit" ? (status ?? "pending") : "paid",
    userId
  });

  return NextResponse.json(sale, { status: 201 });
}
