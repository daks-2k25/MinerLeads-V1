import { HTMLAttributes } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement>;

export function Panel({ className = "", ...props }: PanelProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface shadow-sm ${className}`}
      {...props}
    />
  );
}
