import { useState } from "react";
import { Lead } from "@/src/models/lead";
import { SearchHistory } from "@/src/models/searchHistory";

function nomeArquivoDoCabecalho(response: Response): string | null {
  const cabecalho = response.headers.get("Content-Disposition");
  const match = cabecalho?.match(/filename="?([^";]+)"?/);
  return match ? match[1] : null;
}

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExportHistoricoLeads() {
  const [exportandoId, setExportandoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleExportarHistorico = async (item: SearchHistory) => {
    if (item.id === undefined || exportandoId !== null) return;

    setExportandoId(item.id);
    setErro(null);

    try {
      const responseLeads = await fetch(`/api/search-history/${item.id}/leads`);
      if (!responseLeads.ok) {
        setErro("Não foi possível carregar os leads dessa busca.");
        return;
      }
      const leads: Lead[] = await responseLeads.json();

      const responseExport = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leads),
      });

      if (!responseExport.ok) {
        setErro("Não foi possível gerar o arquivo Excel. Tente novamente.");
        return;
      }

      const blob = await responseExport.blob();
      const nomeArquivo = nomeArquivoDoCabecalho(responseExport) ?? "leads.xlsx";
      baixarBlob(blob, nomeArquivo);
    } catch {
      setErro("Não foi possível conectar ao servidor para exportar. Verifique sua conexão.");
    } finally {
      setExportandoId(null);
    }
  };

  return { handleExportarHistorico, exportandoId, erro };
}
