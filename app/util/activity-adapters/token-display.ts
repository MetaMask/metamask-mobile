import type { Formatters } from '@metamask/client-utils';

/**
 * Formats a token quantity with an optional symbol suffix using the
 * locale-aware `formatTokenAmount` from `@metamask/client-utils`. Passes
 * non-numeric amounts through verbatim and trims the trailing separator when
 * there is no symbol.
 */
export function formatTokenDisplayAmount(
  formatters: Formatters,
  amount: string,
  symbol?: string,
): string {
  if (!Number.isFinite(Number(amount))) {
    return symbol ? `${amount} ${symbol}` : amount;
  }

  return formatters
    .formatTokenAmount(amount as `${number}`, symbol ?? '')
    .trimEnd();
}
