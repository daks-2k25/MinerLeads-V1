export const runtime = "nodejs";

const encoder = new TextEncoder();

function linhaNdjson(evento: Record<string, unknown>) {
  return encoder.encode(JSON.stringify(evento) + "\n");
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(linhaNdjson({ tipo: "status", texto: "Primeira mensagem" }));

      await esperar(2000);
      controller.enqueue(linhaNdjson({ tipo: "status", texto: "Segunda mensagem" }));

      await esperar(2000);
      controller.enqueue(linhaNdjson({ tipo: "status", texto: "Terceira mensagem" }));

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
