/** Decimal input from a form or stream. An absent or invalid value is not zero. */
export function parseOrderNumber(
  value: string | undefined,
): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A quote must be positive; zero is valid for a fee or change, not a price. */
export function parseOrderPrice(value: string | undefined): number | undefined {
  const parsed = parseOrderNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}
