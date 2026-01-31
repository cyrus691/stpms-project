import { NextResponse } from "next/server";

export async function GET() {
  // Implement signed URLs or direct-to-storage uploads during migration
  return NextResponse.json({ message: "Uploads endpoint placeholder" });
}

export async function POST() {
  return NextResponse.json({ message: "Handle file upload wiring here" });
}
