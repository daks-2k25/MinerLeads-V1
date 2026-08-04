import { Panel } from "@/components/ui/Panel";

export function EmptyState() {
  return (
    <Panel className="flex flex-col items-center gap-1.5 px-6 py-14 text-center">
      <span className="mb-1.5 h-9 w-9 rounded-full border-2 border-dashed border-muted-2" />
      <p className="text-[13.5px] font-semibold text-foreground">
        Nenhum lead na lista ainda
      </p>
      <p className="max-w-[38ch] text-[12.5px] text-muted">
        Preencha o termo de busca, cidade, bairro e categoria acima e clique em
        &quot;Pesquisar&quot; para começar a prospecção.
      </p>
    </Panel>
  );
}
