import { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, className = "", ...props }: FieldProps) {
  return (
    <label className="flex flex-1 flex-col gap-0.5 px-3.5 py-2.5">
      <span className="text-[10px] font-semibold tracking-wide text-muted-2 uppercase">
        {label}
      </span>
      <input
        className={`bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-2 disabled:opacity-50 ${className}`}
        {...props}
      />
    </label>
  );
}
