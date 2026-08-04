import { useState } from "react";
import { Lead } from "@/src/models/lead";

function nomeArquivoDoCabecalho(response: Response): string | null {
  const cabecalho = response.headers.get("Content-Disposition");
  const match = cabecalho?.match(/filename="?([^";]+)"?/);
  return match ? match[1] : null;
}

export function useExportLeads(leads: Lead[]) {
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleExportar = async () => {
    if (exportando) return;

    setExportando(true);
    setErro(null);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leads),
      });

      if (!response.ok) {
        setErro("Não foi possível gerar o arquivo Excel. Tente novamente.");
        return;
      }

      const blob = await response.blob();
      const nomeArquivo = nomeArquivoDoCabecalho(response) ?? "leads.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErro("Não foi possível conectar ao servidor para exportar. Verifique sua conexão.");
    } finally {
      setExportando(false);
    }
  };

  return { handleExportar, exportando, erro };
}
