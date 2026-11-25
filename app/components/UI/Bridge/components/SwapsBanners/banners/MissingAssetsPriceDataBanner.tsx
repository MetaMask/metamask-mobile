import React, { useEffect, useState } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useHasMissingAssetsPriceData } from '../../../hooks/useHasMissingAssetsPriceData';
import { MISSING_PRICE_BANNER_DELAY_MS } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

/**
 * Tells the user that one of the traded tokens has no fiat rate to price it
 * with.
 *
 * Unlike `MissingQuoteAndAssetsPriceDataBanner`, this does not factor in the
 * quote's own price data, so it can be used by flows that don't require an
 * active quote to warn about an unpriced token.
 *
 * A newly selected token's rate is fetched after the selection, so the banner
 * only appears once the price has stayed missing for
 * `MISSING_PRICE_BANNER_DELAY_MS`. It hides immediately when the price resolves.
 */
export const MissingAssetsPriceDataBanner = () => {
  const isMissingPrice = useHasMissingAssetsPriceData();
  const [hasDelayElapsed, setHasDelayElapsed] = useState(false);

  useEffect(() => {
    if (!isMissingPrice) {
      setHasDelayElapsed(false);
      return;
    }

    const timeout = setTimeout(
      () => setHasDelayElapsed(true),
      MISSING_PRICE_BANNER_DELAY_MS,
    );

    return () => clearTimeout(timeout);
  }, [isMissingPrice]);

  if (!isMissingPrice || !hasDelayElapsed) {
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
