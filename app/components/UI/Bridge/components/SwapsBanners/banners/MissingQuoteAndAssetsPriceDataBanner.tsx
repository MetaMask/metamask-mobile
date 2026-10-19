import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useHasMissingQuoteAndAssetsPriceData } from '../../../hooks/useHasMissingQuoteAndAssetsPriceData';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

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
  const isMissingPrice = useHasMissingQuoteAndAssetsPriceData();

  if (!isMissingPrice) {
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
