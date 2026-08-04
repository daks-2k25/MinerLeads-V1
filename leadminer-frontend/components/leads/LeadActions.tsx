"use client";

import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, useState } from "react";
import { Lead } from "@/src/models/lead";
import { CheckIcon, CopyIcon, ExternalLinkIcon, MapPinIcon } from "@/components/leads/icons";

const actionButtonClassName =
  "flex h-7 w-7 items-center justify-center rounded-[6px] border border-border text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40";

function normalizarUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

type ActionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode };

function ActionLink({ children, className = "", ...props }: ActionLinkProps) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={`${actionButtonClassName} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

function ActionButton({ children, className = "", ...props }: ActionButtonProps) {
  return (
    <button type="button" className={`${actionButtonClassName} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LeadActions({ lead }: { lead: Lead }) {
  const [copiado, setCopiado] = useState(false);

  const copiarTelefone = async () => {
    if (!lead.telefone) return;
    try {
      await navigator.clipboard.writeText(lead.telefone);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // clipboard indisponível neste navegador/contexto — sem ação adicional
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <ActionLink href={lead.urlMaps} title="Abrir no Google Maps" aria-label="Abrir no Google Maps">
        <MapPinIcon className="h-3.5 w-3.5" />
      </ActionLink>

      {lead.website && (
        <ActionLink
          href={normalizarUrl(lead.website)}
          title="Abrir site"
          aria-label="Abrir site"
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </ActionLink>
      )}

      {lead.telefone && (
        <ActionButton
          onClick={copiarTelefone}
          title={copiado ? "Telefone copiado" : "Copiar telefone"}
          aria-label={copiado ? "Telefone copiado" : "Copiar telefone"}
        >
          {copiado ? (
            <CheckIcon className="h-3.5 w-3.5 text-success" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
        </ActionButton>
      )}
    </div>
  );
}
