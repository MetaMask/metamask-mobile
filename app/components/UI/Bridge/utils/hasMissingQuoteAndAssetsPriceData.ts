import type { DeepPartial, QuoteResponse } from '@metamask/bridge-controller';
import type { BridgeToken } from '../types';
import { hasMissingPriceData } from './hasMissingPriceData';
import { hasMissingTokenFiatRate } from './hasMissingTokenFiatRate';

interface Params {
  sourceAmount?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceFiatRate?: number;
  destFiatRate?: number;
  activeQuote?: DeepPartial<QuoteResponse> | null;
  isActiveQuoteForCurrentTokenPair?: boolean;
}

/**
 * True when a quoted limit/recurring order cannot be priced: the quote is
 * missing market data, or one of the selected tokens has no fiat rate.
 *
 * Hidden until an amount is entered and a quote for the current pair is
 * available, so an in-flight fetch is not treated as a missing-price warning.
 */
export const hasMissingQuoteAndAssetsPriceData = ({
  sourceAmount,
  sourceToken,
  destToken,
  sourceFiatRate,
  destFiatRate,
  activeQuote,
  isActiveQuoteForCurrentTokenPair,
}: Params) => {
  const hasEnteredAmount = Boolean(sourceAmount) && Number(sourceAmount) > 0;
  const isMissingPrice =
    hasMissingPriceData(activeQuote) ||
    hasMissingTokenFiatRate(sourceToken, sourceFiatRate) ||
    hasMissingTokenFiatRate(destToken, destFiatRate);

  return Boolean(
    hasEnteredAmount &&
      activeQuote &&
      isActiveQuoteForCurrentTokenPair &&
      isMissingPrice,
  );
};
