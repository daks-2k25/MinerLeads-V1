import { SavedSearch } from "@/src/models/savedSearch";

type SavedSearchItemProps = {
  busca: SavedSearch;
  onSelect: (busca: SavedSearch) => void;
  onRemove: (id: number) => void;
};

export function SavedSearchItem({ busca, onSelect, onRemove }: SavedSearchItemProps) {
  return (
    <div className="flex items-center gap-1 rounded-[6px] px-2 py-1.5 text-[12.5px] text-foreground transition-colors hover:bg-surface">
      <button
        type="button"
        onClick={() => onSelect(busca)}
        title={busca.nome}
        className="min-w-0 flex-1 truncate text-left font-medium"
      >
        {busca.nome}
      </button>
      <button
        type="button"
        onClick={() => {
          if (busca.id !== undefined && window.confirm(`Excluir a busca salva "${busca.nome}"?`)) {
            onRemove(busca.id);
          }
        }}
        aria-label={`Excluir busca ${busca.nome}`}
        title="Excluir"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-muted-2 transition-colors hover:bg-danger-soft hover:text-danger"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      </button>
    </div>
  );
}
