import { NextResponse } from "next/server";
import { getConnection } from "@/lib/prisma";
import { getBusinessSaleModel } from "@/lib/models/BusinessSale";
import { Types } from "mongoose";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const saleId = params.id;
  if (!Types.ObjectId.isValid(saleId)) {
    return NextResponse.json({ error: "Invalid sale id" }, { status: 400 });
  }
  const { amount, method } = await request.json();
  if (!amount || amount <= 0 || !method) {
    return NextResponse.json({ error: "Amount and method required" }, { status: 400 });
  }
  const conn = await getConnection();
  const BusinessSale = getBusinessSaleModel(conn);
  const sale = await BusinessSale.findById(saleId);
  if (!sale) {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }
  // Add payment
  sale.payments.push({ amount, date: new Date(), method });
  // Update status
  const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid >= sale.totalAmount) {
    sale.status = "paid";
  } else {
    sale.status = "pending";
  }
  await sale.save();
  return NextResponse.json(sale);
}
