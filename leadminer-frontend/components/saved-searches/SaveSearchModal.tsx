"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Field } from "@/components/ui/Field";

type SaveSearchModalProps = {
  aberto: boolean;
  termoBusca: string;
  cidade: string;
  bairro: string;
  categoria: string;
  salvando: boolean;
  erro?: string | null;
  onClose: () => void;
  onSalvar: (nome: string) => void;
};

export function SaveSearchModal({
  aberto,
  termoBusca,
  cidade,
  bairro,
  categoria,
  salvando,
  erro,
  onClose,
  onSalvar,
}: SaveSearchModalProps) {
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (aberto) setNome("");
  }, [aberto]);

  if (!aberto) return null;

  const resumo = [termoBusca, bairro, cidade, categoria].filter(Boolean).join(" · ");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nomeAparado = nome.trim();
    if (!nomeAparado) return;
    onSalvar(nomeAparado);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <Panel
        className="w-full max-w-[380px] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-[13.5px] font-bold text-foreground">Salvar busca</h3>
          <p className="mt-1 truncate text-[12px] text-muted">{resumo || "—"}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field
            label="Nome da busca"
            placeholder="Ex.: Clínicas Curitiba"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            autoFocus
            disabled={salvando}
          />

          {erro && (
            <p className="px-5 pb-3 text-[12px] text-danger" role="alert">
              {erro}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={salvando || !nome.trim()}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
