import type { BridgeToken } from '../../../../../../UI/Bridge/types';

/**
 * Formats a human-readable exchange rate between destination and source tokens.
 * Example: "1 ETH = 4,381 USDC"
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
  const formatted = sourcePerDest.toLocaleString(undefined, {
    maximumFractionDigits: sourcePerDest >= 100 ? 0 : 4,
  });

  return `1 ${destToken.symbol} = ${formatted} ${sourceToken.symbol}`;
}
