import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";

type LoadingStateProps = {
  progresso?: {
    etapa: string;
    progresso: number;
  } | null;
  cancelando?: boolean;
};

// Só usadas quando o backend não envia uma etapa real (progresso == null) —
// é puramente uma troca de texto de apresentação durante a espera, nunca um
// dado inventado (nenhum número/porcentagem é fabricado aqui).
const FRASES_MINERACAO = [
  "Minerando oportunidades...",
  "Vasculhando o Google Maps...",
  "Capturando dados de contato...",
  "Consolidando endereços e categorias...",
  "Lapidando os resultados...",
];

export function LoadingState({ progresso, cancelando = false }: LoadingStateProps) {
  const linhas = Array.from({ length: 3 });
  const [fraseIndex, setFraseIndex] = useState(0);

  useEffect(() => {
    if (progresso || cancelando) return;
    const intervalo = setInterval(() => {
      setFraseIndex((atual) => (atual + 1) % FRASES_MINERACAO.length);
    }, 2400);
    return () => clearInterval(intervalo);
  }, [progresso, cancelando]);

  const texto = cancelando
    ? "Cancelando busca..."
    : progresso
      ? `${progresso.etapa} - ${progresso.progresso}%`
      : FRASES_MINERACAO[fraseIndex];

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft ring-1 ring-accent/20">
          <span className="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring" />
          <span
            className="animate-radar-sweep absolute inset-0"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--accent) 60%, transparent) 28deg, transparent 85deg)",
            }}
          />
          <span className="absolute inset-[6px] rounded-full border border-accent/25" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        <span className="text-[13px] font-semibold text-foreground">{texto}</span>
      </div>

      {progresso && (
        <div className="px-5 pb-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.min(Math.max(progresso.progresso, 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="divide-y divide-border border-t border-border">
        {linhas.map((_, index) => (
          <div key={index} className="flex items-center gap-6 px-4 py-3.5">
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3.5 w-[45%] animate-pulse rounded bg-subtle motion-reduce:animate-none" />
              <div className="h-2.5 w-[30%] animate-pulse rounded bg-subtle/70 motion-reduce:animate-none" />
            </div>
            <div className="h-3.5 w-20 shrink-0 animate-pulse rounded bg-subtle motion-reduce:animate-none" />
            <div className="h-5 w-14 shrink-0 animate-pulse rounded-[5px] bg-subtle motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </Panel>
  );
}
