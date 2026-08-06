/**
 * Formats an entry date as `2026.06.08`.
 *
 * YAML parses a bare `2026-06-08` to midnight UTC. Reading it back with local
 * getters would roll the date backwards in any timezone west of UTC, so the
 * UTC getters are used deliberately — the date written in the file is the date
 * displayed, everywhere.
 */
export function formatEntryDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/** ISO `2026-06-08`, for the <time> element's machine-readable datetime. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
