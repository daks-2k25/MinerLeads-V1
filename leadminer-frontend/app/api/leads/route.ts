import { NextResponse } from "next/server";
import { listarLeads } from "@/src/storage/leads";

export async function GET() {
  const leads = listarLeads();
  return NextResponse.json(leads);
}
