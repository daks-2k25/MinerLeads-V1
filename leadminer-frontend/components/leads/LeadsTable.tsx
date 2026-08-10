import { memo, useEffect, useRef, useState } from "react";
import { Lead } from "@/src/models/lead";
import { Panel } from "@/components/ui/Panel";
import { LeadRow } from "@/components/leads/LeadRow";
import { DatabaseIcon } from "@/components/ui/icons";

const COLUNAS = ["Empresa", "Telefone", "Site", "Categoria", "Capturado em", "Ações"];

// Todas as linhas têm a mesma altura (LeadRow reserva espaço fixo pro
// endereço, mesmo quando o lead não tem um). Isso permite calcular por
// aritmética simples quais linhas estão visíveis, sem medir cada uma.
const ALTURA_LINHA = 84;
const LINHAS_EXTRA = 8; // renderizadas a mais acima/abaixo da área visível, evita flash em branco durante scroll rápido

type LeadsTableProps = {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  className?: string;
};

function LeadsTableComponent({ leads, onSelectLead, className = "" }: LeadsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [faixa, setFaixa] = useState({ inicio: 0, fim: Math.min(leads.length, 40) });

  // Só as linhas realmente visíveis (+ uma margem de segurança) existem no
  // DOM. Sem isso, trocar de tema (ou qualquer mudança que recalcule estilo
  // em cascata a partir do <html>) obriga o navegador a recalcular estilo
  // de todas as centenas de linhas de uma vez — é esse recálculo, não
  // animação nem repaint, que causava o atraso visível na tabela.
  //
  // No desktop este container rola internamente (overflow-auto com altura
  // travada pelo shell da página). No mobile ele não tem altura travada —
  // quem rola é a página inteira, então o scrollTop deste elemento nunca
  // muda. Por isso o cálculo usa os dois sinais: scrollTop cobre o caso
  // desktop, e -boundingRect.top cobre o caso mobile (quanto do container
  // já passou do topo da janela). E o tamanho da janela visível usa
  // window.innerHeight como teto — sem isso, no mobile (altura do
  // container não travada) o ResizeObserver entra num loop que cresce a
  // faixa visível até renderizar a lista inteira de novo.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let agendado = false;

    function calcularFaixa() {
      agendado = false;
      const rect = container!.getBoundingClientRect();
      const offsetRolado = container!.scrollTop + Math.max(0, -rect.top);
      const alturaVisivel = Math.min(container!.clientHeight, window.innerHeight);

      const inicio = Math.max(0, Math.floor(offsetRolado / ALTURA_LINHA) - LINHAS_EXTRA);
      const linhasVisiveis = Math.ceil(alturaVisivel / ALTURA_LINHA) + LINHAS_EXTRA * 2;
      const fim = Math.min(leads.length, inicio + linhasVisiveis);
      setFaixa((atual) => (atual.inicio === inicio && atual.fim === fim ? atual : { inicio, fim }));
    }

    function aoRolar() {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(calcularFaixa);
    }

    calcularFaixa();
    container.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar, { passive: true });
    const observer = new ResizeObserver(aoRolar);
    observer.observe(container);

    return () => {
      container.removeEventListener("scroll", aoRolar);
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      observer.disconnect();
    };
  }, [leads.length]);

  const linhasAntes = faixa.inicio;
  const linhasDepois = leads.length - faixa.fim;
  const leadsVisiveis = leads.slice(faixa.inicio, faixa.fim);

  return (
    <Panel className={`animate-fade-slide-up flex flex-col overflow-hidden ${className}`}>
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft text-accent">
          <DatabaseIcon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[13.5px] font-bold text-foreground">
          Leads
          <span className="ml-1.5 text-[12px] font-normal text-muted">
            {leads.length} resultados
          </span>
        </h3>
      </div>
      <div ref={scrollRef} className="scroll-elegante min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[820px] border-collapse text-[13px]">
          <thead>
            <tr>
              {COLUNAS.map((titulo) => (
                <th
                  key={titulo}
                  className="sticky top-0 border-b border-border bg-surface px-4 py-2.5 text-left text-[10.5px] font-bold tracking-wide text-muted-2 uppercase"
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasAntes > 0 && (
              <tr aria-hidden="true" style={{ height: linhasAntes * ALTURA_LINHA }}>
                <td colSpan={COLUNAS.length} className="p-0" />
              </tr>
            )}
            {leadsVisiveis.map((lead, i) => (
              <LeadRow key={`${lead.urlMaps}-${faixa.inicio + i}`} lead={lead} onSelect={onSelectLead} />
            ))}
            {linhasDepois > 0 && (
              <tr aria-hidden="true" style={{ height: linhasDepois * ALTURA_LINHA }}>
                <td colSpan={COLUNAS.length} className="p-0" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export const LeadsTable = memo(LeadsTableComponent);
