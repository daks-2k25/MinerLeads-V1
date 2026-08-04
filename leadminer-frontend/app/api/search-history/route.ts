import { NextResponse } from "next/server";
import { listarHistoricoBuscas, registrarBuscaHistorico } from "@/src/storage/searchHistory";

export async function GET() {
  const historico = listarHistoricoBuscas();
  return NextResponse.json(historico);
}

export async function POST(request: Request) {
  const { termoBusca, cidade, bairro, categoria, quantidadeLeads } = await request.json();

  if (!termoBusca || typeof quantidadeLeads !== "number") {
    return NextResponse.json(
      { error: "termoBusca e quantidadeLeads são obrigatórios" },
      { status: 400 }
    );
  }

  const registro = registrarBuscaHistorico({
    termoBusca,
    cidade,
    bairro,
    categoria,
    quantidadeLeads,
  });
  return NextResponse.json(registro, { status: 201 });
}
