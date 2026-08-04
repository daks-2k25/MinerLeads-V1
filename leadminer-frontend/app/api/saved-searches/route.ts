import { NextResponse } from "next/server";
import { criarBuscaSalva, listarBuscasSalvas } from "@/src/storage/savedSearches";

export async function GET() {
  const buscas = listarBuscasSalvas();
  return NextResponse.json(buscas);
}

export async function POST(request: Request) {
  const { nome, termoBusca, cidade, bairro, categoria } = await request.json();

  if (!nome || !termoBusca) {
    return NextResponse.json(
      { error: "nome e termoBusca são obrigatórios" },
      { status: 400 }
    );
  }

  const buscaSalva = criarBuscaSalva({ nome, termoBusca, cidade, bairro, categoria });
  return NextResponse.json(buscaSalva, { status: 201 });
}
