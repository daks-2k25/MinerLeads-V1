import { NextResponse } from "next/server";
import { executarScraping } from "@/src/scraper/service";
import { registrarBuscaHistorico, vincularLeadsABusca } from "@/src/storage/searchHistory";
import { buscarIdsPorUrlMaps } from "@/src/storage/leads";
import { registrarLog } from "@/src/storage/logs";

const ORIGEM_LOG = "api/scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

const encoder = new TextEncoder();

let buscaEmAndamento = false;

function linhaNdjson(evento: Record<string, unknown>) {
  return encoder.encode(JSON.stringify(evento) + "\n");
}

function mensagemAmigavelParaErro(mensagemTecnica: string): string {
  if (/já existe um scraping em andamento/i.test(mensagemTecnica)) {
    return "Já existe uma busca em andamento. Aguarde a finalização antes de iniciar uma nova.";
  }

  if (/timeout/i.test(mensagemTecnica)) {
    return "A busca demorou mais do que o esperado e não pôde ser concluída. Tente novamente.";
  }

  if (/net::|ENOTFOUND|ECONNREFUSED|ECONNRESET/i.test(mensagemTecnica)) {
    return "Não foi possível conectar à internet para realizar a busca. Verifique a conexão e tente novamente.";
  }

  if (/browserType\.launch|Executable doesn't exist/i.test(mensagemTecnica)) {
    return "Não foi possível iniciar o navegador para realizar a busca. Tente novamente em instantes.";
  }

  return "Erro ao executar scraping";
}

export async function POST(request: Request) {
  let corpo: { termoBusca: string; cidade: string; bairro: string; categoria: string };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível interpretar os dados enviados. Verifique e tente novamente." },
      { status: 400 }
    );
  }

  const { termoBusca, cidade, bairro, categoria } = corpo;

  if (!termoBusca) {
    return NextResponse.json({ error: "termoBusca é obrigatório" }, { status: 400 });
  }

  if (buscaEmAndamento) {
    return NextResponse.json(
      {
        error:
          "Já existe uma busca em andamento. Aguarde a finalização antes de iniciar uma nova.",
      },
      { status: 409 }
    );
  }

  buscaEmAndamento = true;

  const stream = new ReadableStream({
    async start(controller) {
      const inicioBusca = Date.now();

      registrarLog("info", ORIGEM_LOG, "Busca iniciada", {
        termoBusca,
        cidade,
        bairro,
        categoria,
      });

      try {
        const leads = await executarScraping(
          termoBusca,
          cidade,
          bairro,
          categoria,
          (etapa, progresso) => {
            controller.enqueue(linhaNdjson({ tipo: "status", etapa, progresso }));
          }
        );

        let buscaId: number | undefined;

        try {
          const registro = registrarBuscaHistorico({
            termoBusca,
            cidade,
            bairro,
            categoria,
            quantidadeLeads: leads.length,
          });

          buscaId = registro.id;

          if (registro.id !== undefined) {
            const leadsEncontrados = buscarIdsPorUrlMaps(leads.map((lead) => lead.urlMaps));
            vincularLeadsABusca(
              registro.id,
              leadsEncontrados.map((lead) => lead.id)
            );
          }
        } catch (erroHistorico) {
          console.error(
            "[API /api/scraper] Erro ao registrar histórico de busca:",
            erroHistorico
          );
          registrarLog(
            "warn",
            ORIGEM_LOG,
            "Falha ao registrar histórico",
            {
              termoBusca,
              erro: erroHistorico instanceof Error ? erroHistorico.message : String(erroHistorico),
            }
          );
        }

        registrarLog(
          "info",
          ORIGEM_LOG,
          "Busca concluída",
          { quantidadeLeads: leads.length, duracaoMs: Date.now() - inicioBusca },
          buscaId
        );

        controller.enqueue(linhaNdjson({ tipo: "resultado", leads }));
      } catch (erro) {
        console.error("[API /api/scraper] Erro ao executar scraping:", erro);
        const detalhe = erro instanceof Error ? erro.message : String(erro);
        registrarLog("error", ORIGEM_LOG, "Falha na busca", {
          termoBusca,
          cidade,
          bairro,
          categoria,
          error: mensagemAmigavelParaErro(detalhe),
          detalhe,
          duracaoMs: Date.now() - inicioBusca,
        });
        controller.enqueue(
          linhaNdjson({ tipo: "erro", error: mensagemAmigavelParaErro(detalhe), detalhe })
        );
      } finally {
        buscaEmAndamento = false;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
