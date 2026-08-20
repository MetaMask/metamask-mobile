import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useTokenFiatRate } from '../../../hooks/useTokenFiatRate';
import { hasMissingPriceData } from '../../../utils/hasMissingPriceData';
import { hasMissingTokenFiatRate } from '../../../utils/hasMissingTokenFiatRate';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { useSwapsBannersContext } from '../SwapsBannersContext';

/**
 * Tells the user the quote came back without the market price data needed to
 * work out the price impact, or that one of the traded tokens has no fiat rate
 * to price it with.
 *
 * Order types that price an order ahead of execution use this instead of
 * `MissingQuotePriceDataBanner`, because an unpriced token leaves them without
 * a fiat figure to set that order against.
 */
export const MissingQuoteAndAssetsPriceDataBanner = () => {
  const { sourceAmount, sourceToken, destToken } = useSwapsBannersContext();
  const { activeQuote, isActiveQuoteForCurrentTokenPair } =
    useBridgeQuoteDataContext();
  const sourceFiatRate = useTokenFiatRate(sourceToken);
  const destFiatRate = useTokenFiatRate(destToken);

  const hasEnteredAmount = Boolean(sourceAmount) && Number(sourceAmount) > 0;
  // Rates are only fetched for the selected pair, so waiting for a quote that
  // matches that pair keeps an in-flight fetch (or a stale quote after a
  // token-selector change) from being mistaken for a token that has no price.
  const isMissingPrice =
    hasMissingPriceData(activeQuote) ||
    hasMissingTokenFiatRate(sourceToken, sourceFiatRate) ||
    hasMissingTokenFiatRate(destToken, destFiatRate);

  if (
    !hasEnteredAmount ||
    !activeQuote ||
    !isActiveQuoteForCurrentTokenPair ||
    !isMissingPrice
  ) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Danger}
      description={strings('swaps.market_price_unavailable')}
      testID={SwapsBannersSelectorsIDs.MISSING_QUOTE_AND_ASSETS_PRICE}
    />
  );
};
