import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { hasMissingPriceData } from '../../../utils/hasMissingPriceData';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { useSwapsBannersContext } from '../SwapsBannersContext';

/**
 * Tells the user the quote came back without the market price data needed to
 * work out the price impact.
 */
export const MissingPriceDataBanner = () => {
  const { sourceAmount } = useSwapsBannersContext();
  const { activeQuote } = useBridgeQuoteDataContext();

  const hasEnteredAmount = Boolean(sourceAmount) && Number(sourceAmount) > 0;

  if (!hasEnteredAmount || !activeQuote || !hasMissingPriceData(activeQuote)) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Danger}
      description={strings('swaps.market_price_unavailable')}
      testID={SwapsBannersSelectorsIDs.MISSING_PRICE}
    />
  );
};
