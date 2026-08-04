export function StatusChip({
  ok,
  labelOk,
  labelNo,
}: {
  ok: boolean;
  labelOk: string;
  labelNo: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11px] font-bold ${
        ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ok ? labelOk : labelNo}
    </span>
  );
}
