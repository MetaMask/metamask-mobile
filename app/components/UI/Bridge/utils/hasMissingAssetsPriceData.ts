import type { BridgeToken } from '../types';
import { hasMissingTokenFiatRate } from './hasMissingTokenFiatRate';

interface Params {
  sourceAmount?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceFiatRate?: number;
  destFiatRate?: number;
}

/**
 * True when one of the selected tokens has no fiat rate to price it with.
 *
 * Unlike `hasMissingQuoteAndAssetsPriceData`, this does not factor in a
 * quote's own price data, so it can be used by flows that don't require an
 * active quote to be priced.
 *
 * Hidden until an amount is entered, so an in-flight fetch is not treated as
 * a missing-price warning.
 */
export const hasMissingAssetsPriceData = ({
  sourceAmount,
  sourceToken,
  destToken,
  sourceFiatRate,
  destFiatRate,
}: Params) => {
  const hasEnteredAmount = Boolean(sourceAmount) && Number(sourceAmount) > 0;
  const isMissingPrice =
    hasMissingTokenFiatRate(sourceToken, sourceFiatRate) ||
    hasMissingTokenFiatRate(destToken, destFiatRate);

  return Boolean(hasEnteredAmount && isMissingPrice);
};
