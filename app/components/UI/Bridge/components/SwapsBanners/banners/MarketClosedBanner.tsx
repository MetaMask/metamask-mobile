import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStockMarketHours } from '../../../hooks/useStockMarketHours';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

/**
 * Blocks the quote UI when a stock-RWA leg is fully closed — neither regular
 * hours nor an off-hours window is active.
 */
export const MarketClosedBanner = () => {
  const { isStockMarketClosed } = useStockMarketHours();

  if (!isStockMarketClosed) {
    return null;
  }

  return (
    <Box twClassName="mb-3">
      <BannerAlert
        severity={BannerAlertSeverity.Danger}
        title={strings('bridge.market_closed.title')}
        description={strings('bridge.market_closed.description')}
        testID={SwapsBannersSelectorsIDs.MARKET_CLOSED}
      />
    </Box>
  );
};
