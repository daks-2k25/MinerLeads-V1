"use client";

import { useMemo, useState } from "react";
import { SearchHistory } from "@/src/models/searchHistory";
import { SearchHistoryItem } from "@/components/search-history/SearchHistoryItem";
import { SearchHistoryFilters, PeriodoFiltro } from "@/components/search-history/SearchHistoryFilters";

function inicioDoDia(data: Date) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia.getTime();
}

function dentroDoPeriodo(criadoEm: string | undefined, periodo: PeriodoFiltro) {
  if (periodo === "todos") return true;
  if (!criadoEm) return false;

  const data = new Date(criadoEm).getTime();
  if (Number.isNaN(data)) return false;

  if (periodo === "hoje") {
    return data >= inicioDoDia(new Date());
  }

  const dias = periodo === "7dias" ? 7 : 30;
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  return data >= limite;
}

type SearchHistoryListProps = {
  historico: SearchHistory[];
  loading: boolean;
  error: string | null;
  onRepetir: (item: SearchHistory) => void;
  onRemove: (id: number) => void;
  onExportar: (item: SearchHistory) => void;
  exportandoId: number | null;
  erroExportacao: string | null;
};

export function SearchHistoryList({
  historico,
  loading,
  error,
  onRepetir,
  onRemove,
  onExportar,
  exportandoId,
  erroExportacao,
}: SearchHistoryListProps) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("todos");

  const historicoFiltrado = useMemo(
    () => historico.filter((item) => dentroDoPeriodo(item.criadoEm, periodo)),
    [historico, periodo]
  );

  return (
    <div className="flex flex-col gap-1">
      <SearchHistoryFilters periodo={periodo} onChange={setPeriodo} />

      {erroExportacao && (
        <div className="px-2 py-1.5 text-[11.5px] text-danger">{erroExportacao}</div>
      )}

      {loading ? (
        <div className="px-2 py-1.5 text-[11.5px] text-muted-2">Carregando...</div>
      ) : error ? (
        <div className="px-2 py-1.5 text-[11.5px] text-danger">{error}</div>
      ) : historicoFiltrado.length === 0 ? (
        <div className="px-2 py-1.5 text-[11.5px] text-muted-2">Nenhuma busca no histórico.</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {historicoFiltrado.map((item) => (
            <SearchHistoryItem
              key={item.id}
              item={item}
              onRepetir={onRepetir}
              onRemove={onRemove}
              onExportar={onExportar}
              exportando={exportandoId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
