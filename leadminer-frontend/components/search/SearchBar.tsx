import { ChangeEvent, ComponentType } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { SearchIcon, TagIcon } from "@/components/ui/icons";
import { MapPinIcon } from "@/components/leads/icons";

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
  onCancelarBusca: () => void;
  loading: boolean;
  cancelando: boolean;
  exportando: boolean;
  podeExportar: boolean;
  podeSalvarBusca: boolean;
}

function handler(setter: (value: string) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => setter(event.target.value);
}

function FieldComIcone({
  icon: Icon,
  destaque = false,
  className = "",
  fieldClassName = "",
  ...fieldProps
}: {
  icon: ComponentType<{ className?: string }>;
  // Campo principal da busca ("Termo"): ganha mais espaço na linha e texto
  // maior/mais forte, para se destacar dos filtros secundários (Cidade,
  // Bairro, Categoria) — reforça que a pesquisa é a ação central do produto.
  destaque?: boolean;
  className?: string;
  fieldClassName?: string;
} & Omit<Parameters<typeof Field>[0], "className">) {
  return (
    <div className={`relative flex min-w-0 flex-1 ${destaque ? "lg:flex-[1.6]" : ""} ${className}`}>
      <Icon
        className={`pointer-events-none absolute left-3.5 top-[27px] h-3.5 w-3.5 ${
          destaque ? "text-accent" : "text-muted-2"
        }`}
      />
      <Field
        {...fieldProps}
        className={`pl-5 ${destaque ? "text-[15px] font-medium" : ""} ${fieldClassName}`}
      />
    </div>
  );
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
  onCancelarBusca,
  loading,
  cancelando,
  exportando,
  podeExportar,
  podeSalvarBusca,
}: SearchBarProps) {
  return (
    <Panel className="animate-fade-slide-up overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col divide-y divide-border lg:flex-row lg:divide-x lg:divide-y-0">
          <FieldComIcone
            icon={SearchIcon}
            destaque
            label="Termo"
            placeholder="Restaurante"
            value={termoBusca}
            onChange={handler(onTermoBuscaChange)}
            disabled={loading}
          />
          <FieldComIcone
            icon={MapPinIcon}
            label="Cidade"
            placeholder="Curitiba"
            value={cidade}
            onChange={handler(onCidadeChange)}
            disabled={loading}
          />
          <FieldComIcone
            icon={MapPinIcon}
            label="Bairro"
            placeholder="Batel"
            value={bairro}
            onChange={handler(onBairroChange)}
            disabled={loading}
          />
          <FieldComIcone
            icon={TagIcon}
            label="Categoria"
            placeholder="Alimentação"
            value={categoria}
            onChange={handler(onCategoriaChange)}
            disabled={loading}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-subtle p-2 lg:flex-nowrap lg:border-t-0 lg:border-l">
          <Button
            variant="ghost"
            onClick={onExportar}
            disabled={loading || exportando || !podeExportar}
            title={!podeExportar ? "Pesquise para ter leads na lista antes de exportar" : undefined}
          >
            {exportando ? "Exportando..." : "Exportar"}
          </Button>
          <Button
            variant="ghost"
            onClick={onSalvarBusca}
            disabled={loading || !podeSalvarBusca}
            title={!podeSalvarBusca ? "Preencha o termo de busca para salvar esta busca" : undefined}
          >
            Salvar busca
          </Button>
          {loading && (
            <Button variant="danger" onClick={onCancelarBusca} disabled={cancelando}>
              {cancelando ? "Cancelando..." : "Cancelar busca"}
            </Button>
          )}
          <Button variant="primary" onClick={onPesquisar} disabled={loading} aria-busy={loading}>
            {loading && (
              <span className="mr-1.5 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] motion-reduce:animate-none" />
            )}
            {loading ? "Pesquisando..." : "Pesquisar"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
