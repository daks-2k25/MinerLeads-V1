"use client";

import { ReactNode, useEffect, useState } from "react";
import { Lead } from "@/src/models/lead";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

function normalizarUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function formatarData(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Panel className="p-4">
      <h4 className="text-[10.5px] font-bold tracking-wide text-muted-2 uppercase">{titulo}</h4>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </Panel>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted">{label}</div>
      <div className="mt-0.5 text-[13px] text-foreground">{valor}</div>
    </div>
  );
}

type LeadDetailsPanelProps = {
  lead: Lead | null;
  onClose: () => void;
};

export function LeadDetailsPanel({ lead, onClose }: LeadDetailsPanelProps) {
  const [copiado, setCopiado] = useState(false);
  const [leadExibido, setLeadExibido] = useState<Lead | null>(null);
  const aberto = lead !== null;

  useEffect(() => {
    if (lead) setLeadExibido(lead);
  }, [lead]);

  useEffect(() => {
    if (!aberto) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aberto, onClose]);

  useEffect(() => {
    if (!aberto) return;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [aberto]);

  const copiarTelefone = async () => {
    if (!leadExibido?.telefone) return;
    try {
      await navigator.clipboard.writeText(leadExibido.telefone);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // clipboard indisponível neste navegador/contexto — sem ação adicional
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <Panel
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do lead"
        className={`fixed top-0 right-0 z-50 flex h-full w-[calc(100vw-2rem)] flex-col md:w-[380px] lg:w-[420px] transition-transform duration-300 ease-out motion-reduce:transition-none ${
          aberto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold text-foreground">
              {leadExibido?.nome ?? "—"}
            </h3>
            {leadExibido && (
              <span className="mt-1.5 inline-flex items-center rounded-[5px] bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                {leadExibido.categoria}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted transition-colors hover:border-accent hover:text-accent"
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
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {leadExibido && (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
            <Secao titulo="Localização">
              <Campo label="Endereço" valor={leadExibido.endereco ?? "—"} />
              <Campo label="Cidade" valor={leadExibido.cidade ?? "—"} />
            </Secao>

            <Secao titulo="Contato">
              <Campo label="Telefone" valor={leadExibido.telefone ?? "—"} />
              <Campo label="Website" valor={leadExibido.website ?? "—"} />
            </Secao>

            <Secao titulo="Captura">
              <Campo label="Data" valor={formatarData(leadExibido.capturadoEm)} />
            </Secao>

            <div className="mt-2 flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => window.open(leadExibido.urlMaps, "_blank", "noopener,noreferrer")}
              >
                Abrir Google Maps
              </Button>

              {leadExibido.website && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    window.open(normalizarUrl(leadExibido.website as string), "_blank", "noopener,noreferrer")
                  }
                >
                  Abrir Site
                </Button>
              )}

              {leadExibido.telefone && (
                <Button variant="ghost" onClick={copiarTelefone}>
                  {copiado ? "Telefone copiado" : "Copiar telefone"}
                </Button>
              )}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}
