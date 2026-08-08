import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { MINIMUM_DISPLAY_THRESHOLD } from '../../../../../../../util/number/bigint';
import { formatQuickBuyRateValue } from './formatQuickBuyRateValue';

/**
 * Formats a human-readable exchange rate between destination and source tokens.
 * Example: "1 ETH = 1,862.12 USDC"
 *
 * Uses the same locale-aware formatting as the quote-derived `formattedRate`
 * in the controller so the pre-quote and post-quote pills look identical:
 * - Rate > 1 (e.g. ETH→USDC): up to 2 decimal places with thousands grouping.
 * - Rate < 1 (e.g. USDC→ETH): 2–3 significant digits.
 * - Sub-threshold rates (meme coins): shown as `< 0.00001`.
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

  // Preserve the dust-threshold display for sub-micro rates (e.g. meme coins).
  if (sourcePerDest < MINIMUM_DISPLAY_THRESHOLD) {
    return `1 ${destToken.symbol} = < ${MINIMUM_DISPLAY_THRESHOLD} ${sourceToken.symbol}`;
  }

  const formattedRate = formatQuickBuyRateValue(
    sourcePerDest,
    sourcePerDest > 1
      ? { maximumFractionDigits: 2 }
      : { maximumSignificantDigits: 3 },
  );

  return `1 ${destToken.symbol} = ${formattedRate} ${sourceToken.symbol}`;
}
