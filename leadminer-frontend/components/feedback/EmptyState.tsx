import { Panel } from "@/components/ui/Panel";
import { SearchIcon } from "@/components/ui/icons";

type EmptyStateProps = {
  // true quando já existe um resultado de busca (sucesso com zero leads,
  // cancelamento ou erro) — nesses casos o motivo específico já apareceu
  // no StatusBanner acima, então aqui só orientamos a próxima ação, sem
  // repetir a instrução de "primeira busca" como se nada tivesse ocorrido.
  jaTentouBuscar?: boolean;
};

export function EmptyState({ jaTentouBuscar = false }: EmptyStateProps) {
  return (
    <Panel className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
        <SearchIcon className="h-5 w-5" />
      </span>
      <p className="text-[13.5px] font-semibold text-foreground">
        {jaTentouBuscar ? "Nenhum lead para mostrar" : "Nenhum lead na lista ainda"}
      </p>
      <p className="max-w-[38ch] text-[12.5px] text-muted">
        {jaTentouBuscar
          ? "Tente ajustar a cidade, o bairro ou a categoria e pesquise novamente."
          : 'Preencha o termo de busca, cidade, bairro e categoria acima e clique em "Pesquisar" para começar a prospecção.'}
      </p>
    </Panel>
  );
}
