import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "rounded-[7px] px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  const variants = {
    primary: "bg-accent text-accent-contrast",
    ghost: "bg-transparent border border-border text-foreground",
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
