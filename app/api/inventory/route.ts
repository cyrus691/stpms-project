import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getConnection } from "@/lib/prisma";
import { getInventoryItemModel } from "@/lib/models/InventoryItem";
import { getUserModel } from "@/lib/models/User";

export async function GET(request: Request) {
  try {
    const conn = await getConnection();
    const InventoryItem = getInventoryItemModel(conn);
    const User = getUserModel(conn);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }

    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "business") {
      return NextResponse.json({ error: "Business user required" }, { status: 403 });
    }

    const items = await InventoryItem.find({ userId })
      .sort({ name: 1 })
      .limit(500)
      .lean()
      .exec();

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, sku, unitPrice, sellingPrice, quantityInStock, userId } = await request.json();
    if (!name || unitPrice === undefined || sellingPrice === undefined || quantityInStock === undefined || !userId) {
      return NextResponse.json({ error: "name, unitPrice, sellingPrice, quantityInStock, userId required" }, { status: 400 });
    }
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }
    if (Number(quantityInStock) < 0) {
      return NextResponse.json({ error: "quantityInStock must be 0 or higher" }, { status: 400 });
    }
    if (Number(unitPrice) < 0) {
      return NextResponse.json({ error: "unitPrice must be 0 or higher" }, { status: 400 });
    }
    if (Number(sellingPrice) < 0) {
      return NextResponse.json({ error: "sellingPrice must be 0 or higher" }, { status: 400 });
    }

    const conn = await getConnection();
    const InventoryItem = getInventoryItemModel(conn);
    const User = getUserModel(conn);
    const user = await User.findById(userId).select("role").lean();
    if (!user || user.role !== "business") {
      return NextResponse.json({ error: "Business user required" }, { status: 403 });
    }

    const item = await InventoryItem.create({
      name: String(name).trim(),
      sku: sku ? String(sku).trim() : undefined,
      unitPrice: Number(unitPrice),
      sellingPrice: Number(sellingPrice),
      quantityInStock: Number(quantityInStock),
      userId
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}