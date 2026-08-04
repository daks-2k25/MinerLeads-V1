import { NextResponse } from "next/server";
import { removerHistoricoBusca } from "@/src/storage/searchHistory";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  removerHistoricoBusca(idNumerico);
  return NextResponse.json({ ok: true });
}
