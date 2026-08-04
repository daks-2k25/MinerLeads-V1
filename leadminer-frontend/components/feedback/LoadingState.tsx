import { Panel } from "@/components/ui/Panel";

type LoadingStateProps = {
  progresso?: {
    etapa: string;
    progresso: number;
  } | null;
};

export function LoadingState({ progresso }: LoadingStateProps) {
  const linhas = Array.from({ length: 3 });

  const texto = progresso ? `${progresso.etapa} - ${progresso.progresso}%` : "Buscando leads...";

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none" />
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
          <div key={index} className="flex items-center gap-6 px-4 py-3">
            <div className="h-3.5 w-40 animate-pulse rounded bg-subtle motion-reduce:animate-none" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-subtle motion-reduce:animate-none" />
            <div className="h-3.5 w-16 animate-pulse rounded bg-subtle motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </Panel>
  );
}
