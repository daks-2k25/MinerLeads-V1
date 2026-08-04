export type PeriodoFiltro = "todos" | "hoje" | "7dias" | "30dias";

const opcoes: { valor: PeriodoFiltro; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "hoje", label: "Hoje" },
  { valor: "7dias", label: "Últimos 7 dias" },
  { valor: "30dias", label: "Últimos 30 dias" },
];

type SearchHistoryFiltersProps = {
  periodo: PeriodoFiltro;
  onChange: (periodo: PeriodoFiltro) => void;
};

export function SearchHistoryFilters({ periodo, onChange }: SearchHistoryFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1 px-0.5 pb-1">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          aria-pressed={periodo === opcao.valor}
          className={`rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold transition-colors ${
            periodo === opcao.valor
              ? "bg-accent text-accent-contrast"
              : "bg-surface text-muted-2 hover:text-foreground"
          }`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}
