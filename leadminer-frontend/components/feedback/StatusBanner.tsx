export interface SearchStatus {
  message: string;
  tone: "success" | "error";
}

export function StatusBanner({ status }: { status: SearchStatus | null }) {
  if (!status) return null;

  const toneClasses =
    status.tone === "success"
      ? "bg-success-soft text-success"
      : "bg-danger-soft text-danger";

  return (
    <div
      role="status"
      className={`flex items-center gap-2 rounded-[8px] px-3.5 py-2.5 text-[13px] font-medium ${toneClasses}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {status.message}
    </div>
  );
}
