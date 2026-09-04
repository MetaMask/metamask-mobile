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
 * Warns that a stock-RWA leg is only tradable in an off-hours window, so the
 * quoted price is issuer-calculated rather than live market data.
 */
export const OffHoursTradingBanner = () => {
  const { isInOffHoursTrading } = useStockMarketHours();

  if (!isInOffHoursTrading) {
    return null;
  }

  return (
    <Box twClassName="mb-3">
      <BannerAlert
        severity={BannerAlertSeverity.Warning}
        title={strings('bridge.off_hours_trading.title')}
        description={strings('bridge.off_hours_trading.description')}
        testID={SwapsBannersSelectorsIDs.OFF_HOURS_TRADING}
      />
    </Box>
  );
};
