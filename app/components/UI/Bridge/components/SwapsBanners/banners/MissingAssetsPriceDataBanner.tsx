import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useHasMissingAssetsPriceData } from '../../../hooks/useHasMissingAssetsPriceData';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

/**
 * Tells the user that one of the traded tokens has no fiat rate to price it
 * with.
 *
 * Unlike `MissingQuoteAndAssetsPriceDataBanner`, this does not factor in the
 * quote's own price data, so it can be used by flows that don't require an
 * active quote to warn about an unpriced token.
 */
export const MissingAssetsPriceDataBanner = () => {
  const isMissingPrice = useHasMissingAssetsPriceData();

  if (!isMissingPrice) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Danger}
      description={strings('swaps.market_price_unavailable')}
      testID={SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE}
    />
  );
};
