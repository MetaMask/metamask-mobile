import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { formatAmountWithThreshold } from '../../../../../../../util/number/bigint';

/** Matches social leaderboard token amount formatting (see `formatTokenAmount`). */
const MAX_RATE_DECIMAL_PLACES = 5;

/**
 * Formats a human-readable exchange rate between destination and source tokens.
 * Example: "1 ETH = 4,381 USDC"
 *
 * Very small positive rates use the shared dust threshold (`< 0.00001`).
 */
export function formatExchangeRate(
  destToken: BridgeToken | undefined,
  sourceToken: BridgeToken | undefined,
): string | undefined {
  if (!destToken?.currencyExchangeRate || !sourceToken?.currencyExchangeRate) {
    return undefined;
  }

  const destUsd = destToken.currencyExchangeRate;
  const sourceUsd = sourceToken.currencyExchangeRate;
  if (destUsd <= 0 || sourceUsd <= 0) return undefined;

  const sourcePerDest = destUsd / sourceUsd;
  if (sourcePerDest <= 0) return undefined;

  const formattedAmount = String(
    formatAmountWithThreshold(sourcePerDest, MAX_RATE_DECIMAL_PLACES),
  );

  return `1 ${destToken.symbol} = ${formattedAmount} ${sourceToken.symbol}`;
}
