import { NextResponse } from "next/server";
import { listarLeadsDaBusca } from "@/src/storage/searchHistory";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const leads = listarLeadsDaBusca(idNumerico);
  return NextResponse.json(leads);
}
