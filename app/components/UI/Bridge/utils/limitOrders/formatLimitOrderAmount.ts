import { fromTokenMinimalUnitString } from '../../../../../util/number/bigint';
import { formatTokenBalance } from '..';

/**
 * Formats a minimal-unit token amount for display, e.g. `"100000000000000000"`
 * with 18 decimals becomes `"0.1"`.
 *
 * @param amount - The amount in minimal units (e.g. wei).
 * @param decimals - The token's decimals.
 * @returns The formatted, human-readable amount.
 */
export function formatLimitOrderAmount(
  amount: string,
  decimals: number,
): string {
  return formatTokenBalance(fromTokenMinimalUnitString(amount, decimals));
}
