export function StatusChip({
  ok,
  labelOk,
  labelNo,
}: {
  ok: boolean;
  labelOk: string;
  labelNo: string;
}) {
  // "Não ok" aqui é ausência de dado (ex.: empresa sem site cadastrado), não
  // um erro do sistema — por isso usa um tom neutro em vez de `danger`, que
  // fica reservado para falhas reais.
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11px] font-bold ${
        ok ? "bg-success-soft text-success" : "bg-subtle text-muted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ok ? labelOk : labelNo}
    </span>
  );
}
