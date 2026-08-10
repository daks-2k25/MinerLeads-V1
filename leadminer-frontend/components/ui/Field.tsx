import { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, className = "", ...props }: FieldProps) {
  return (
    <label className="group flex min-w-0 flex-1 flex-col gap-0.5 px-3.5 py-2.5 transition-colors focus-within:bg-accent-soft/50">
      <span className="text-[10px] font-semibold tracking-wide text-muted-2 uppercase transition-colors group-focus-within:text-accent">
        {label}
      </span>
      <input
        className={`min-w-0 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-2 disabled:opacity-50 ${className}`}
        {...props}
      />
    </label>
  );
}
