import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "rounded-md px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const variants = {
    primary:
      "bg-accent text-accent-contrast shadow-sm hover:shadow-md hover:brightness-105 active:brightness-95",
    ghost:
      "bg-transparent border border-border text-foreground hover:border-accent/50 hover:bg-subtle",
    danger:
      "bg-transparent border border-danger/30 text-danger hover:border-danger hover:bg-danger-soft",
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
