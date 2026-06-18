export function fmt(n: number | null | undefined, dp = 1): string {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: dp });
}

export function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
