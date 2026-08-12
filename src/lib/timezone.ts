/**
 * Converts a timezone-naive "YYYY-MM-DDTHH:mm" wall-clock string (as produced by
 * <input type="datetime-local">) into the UTC instant it represents in the given
 * IANA timezone. Needed because the server's own timezone (not the browser's) is
 * what plain `new Date(localDateTime)` would otherwise use.
 */
export function zonedDateTimeToUtc(localDateTime: string, timeZone: string): Date {
  // "YYYY-MM-DDTHH:mm" (datetime-local's default precision) or "YYYY-MM-DDTHH:mm:ss".
  const hasSeconds = localDateTime.length > 16;
  const asIfUtc = new Date(`${localDateTime}${hasSeconds ? "" : ":00"}.000Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(asIfUtc).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const wallClockInZoneAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return new Date(asIfUtc.getTime() + (asIfUtc.getTime() - wallClockInZoneAsUtc));
}
