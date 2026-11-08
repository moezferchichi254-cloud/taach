/** "14:05" today, "lun." this week, "12/10" otherwise. */
export function shortTime(iso: string, lang: string) {
  const d = new Date(iso);
  const loc = lang === 'en' ? 'en-GB' : 'fr-FR';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  if (now.getTime() - d.getTime() < 6 * 86400_000) return d.toLocaleDateString(loc, { weekday: 'short' });
  return d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
}
export function longDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
