import { HTMLAttributes } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement>;

export function Panel({ className = "", ...props }: PanelProps) {
  return (
    <div
      className={`rounded-[10px] border border-border bg-surface ${className}`}
      {...props}
    />
  );
}
