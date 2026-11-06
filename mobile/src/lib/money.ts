// All money is integer millimes (1 TND = 1000 millimes). Never floats.

export function formatTND(millimes: number, locale: string, opts: { exact?: boolean } = {}) {
  const dinars = millimes / 1000;
  const whole = Number.isInteger(dinars) && !opts.exact;
  const n = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    minimumFractionDigits: whole ? 0 : 3,
    maximumFractionDigits: whole ? 0 : 3,
  }).format(dinars);
  return locale === 'en' ? `TND ${n}` : `${n} DT`;
}

/** "35,5" or "35.5" typed by a user -> millimes. Returns null if not a valid amount. */
export function parseTND(input: string): number | null {
  const clean = input.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,3})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 1000);
}
