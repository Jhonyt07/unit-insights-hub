export const fmtNumber = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || isNaN(v as number)) return "-";
  if (v === 0) return "-";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v as number);
};

export const fmtMonth = (iso: string): string => {
  // iso is "YYYY-MM-01"
  const [y, m] = iso.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx]}/${y.slice(2)}`;
};

export const fmtMonthFull = (iso: string): string => {
  const [y, m] = iso.split("-");
  const names = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${names[parseInt(m, 10) - 1]} / ${y}`;
};

export const monthsBetween = (startIso: string, endIso: string): string[] => {
  const [sy, sm] = startIso.split("-").map(Number);
  const [ey, em] = endIso.split("-").map(Number);
  const out: string[] = [];
  let y = sy;
  let mo = sm;
  while (y < ey || (y === ey && mo <= em)) {
    out.push(`${y}-${String(mo).padStart(2, "0")}-01`);
    mo++;
    if (mo > 12) {
      mo = 1;
      y++;
    }
  }
  return out;
};