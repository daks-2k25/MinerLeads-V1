import { ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";

export interface SearchBarProps {
  termoBusca: string;
  cidade: string;
  bairro: string;
  categoria: string;
  onTermoBuscaChange: (value: string) => void;
  onCidadeChange: (value: string) => void;
  onBairroChange: (value: string) => void;
  onCategoriaChange: (value: string) => void;
  onPesquisar: () => void;
  onExportar: () => void;
  onSalvarBusca: () => void;
  loading: boolean;
  exportando: boolean;
  podeExportar: boolean;
  podeSalvarBusca: boolean;
}

function handler(setter: (value: string) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => setter(event.target.value);
}

export function SearchBar({
  termoBusca,
  cidade,
  bairro,
  categoria,
  onTermoBuscaChange,
  onCidadeChange,
  onBairroChange,
  onCategoriaChange,
  onPesquisar,
  onExportar,
  onSalvarBusca,
  loading,
  exportando,
  podeExportar,
  podeSalvarBusca,
}: SearchBarProps) {
  return (
    <Panel className="flex flex-col md:flex-row md:items-stretch">
      <div className="flex flex-1 flex-col divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
        <Field
          label="Termo"
          placeholder="Restaurante"
          value={termoBusca}
          onChange={handler(onTermoBuscaChange)}
          disabled={loading}
        />
        <Field
          label="Cidade"
          placeholder="Curitiba"
          value={cidade}
          onChange={handler(onCidadeChange)}
          disabled={loading}
        />
        <Field
          label="Bairro"
          placeholder="Batel"
          value={bairro}
          onChange={handler(onBairroChange)}
          disabled={loading}
        />
        <Field
          label="Categoria"
          placeholder="Alimentação"
          value={categoria}
          onChange={handler(onCategoriaChange)}
          disabled={loading}
        />
      </div>
      <div className="flex items-center gap-1.5 border-t border-border bg-subtle p-2 md:border-t-0 md:border-l">
        <Button variant="ghost" onClick={onExportar} disabled={loading || exportando || !podeExportar}>
          {exportando ? "Exportando..." : "Exportar"}
        </Button>
        <Button variant="ghost" onClick={onSalvarBusca} disabled={loading || !podeSalvarBusca}>
          Salvar busca
        </Button>
        <Button variant="primary" onClick={onPesquisar} disabled={loading} aria-busy={loading}>
          {loading && (
            <span className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] motion-reduce:animate-none" />
          )}
          {loading ? "Pesquisando..." : "Pesquisar"}
        </Button>
      </div>
    </Panel>
  );
}
