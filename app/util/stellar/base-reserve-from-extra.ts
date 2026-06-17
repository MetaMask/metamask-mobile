///: BEGIN:ONLY_INCLUDE_IF(stellar)
import type { StellarBalanceExtra } from './types';

/**
 * Extracts native XLM base reserve from balance enrichment extra.
 */
export function getBaseReserveFromExtra(
  extra: StellarBalanceExtra | undefined,
): string | undefined {
  const value = extra?.baseReserve;
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return value;
}
///: END:ONLY_INCLUDE_IF
