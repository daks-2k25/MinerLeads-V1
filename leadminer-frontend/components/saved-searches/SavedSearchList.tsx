import { SavedSearch } from "@/src/models/savedSearch";
import { SavedSearchItem } from "@/components/saved-searches/SavedSearchItem";

type SavedSearchListProps = {
  buscas: SavedSearch[];
  loading: boolean;
  error: string | null;
  onSelect: (busca: SavedSearch) => void;
  onRemove: (id: number) => void;
};

export function SavedSearchList({ buscas, loading, error, onSelect, onRemove }: SavedSearchListProps) {
  if (loading) {
    return <div className="px-2 py-1.5 text-[11.5px] text-muted-2">Carregando...</div>;
  }

  if (error) {
    return <div className="px-2 py-1.5 text-[11.5px] text-danger">{error}</div>;
  }

  if (buscas.length === 0) {
    return <div className="px-2 py-1.5 text-[11.5px] text-muted-2">Nenhuma busca salva.</div>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {buscas.map((busca) => (
        <SavedSearchItem key={busca.id} busca={busca} onSelect={onSelect} onRemove={onRemove} />
      ))}
    </div>
  );
}
