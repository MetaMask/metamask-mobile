import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  IconName,
} from '@metamask/design-system-react-native';
import { getMarketHoursStatus, isEquityAsset } from '../../utils/marketHours';
import type { PerpsMarketHoursBannerProps } from './PerpsMarketHoursBanner.types';

const PerpsMarketHoursBanner: React.FC<PerpsMarketHoursBannerProps> = ({
  marketType,
  onInfoPress,
  testID = 'perps-market-hours-banner',
}) => {
  const shouldDisplay = useMemo(() => isEquityAsset(marketType), [marketType]);
  const marketHoursStatus = getMarketHoursStatus();

  if (!shouldDisplay) {
    return null;
  }

  const titleText = marketHoursStatus.isOpen
    ? strings('perps.market.trading_24_7')
    : strings('perps.market.after_hours_trading_banner');

  const subtitleText = marketHoursStatus.isOpen
    ? strings('perps.market.expect_more_volatility')
    : strings('perps.market.pay_attention_to_volatility');

  return (
    <Box twClassName="px-4" testID={testID}>
      <BannerAlert
        severity={BannerAlertSeverity.Neutral}
        iconProps={{ name: IconName.Clock }}
        title={titleText}
        description={subtitleText}
        actionButtonLabel={strings('accounts.learn_more')}
        actionButtonOnPress={onInfoPress}
        actionButtonProps={{
          testID: `${testID}-info-button`,
        }}
      />
    </Box>
  );
};

export default PerpsMarketHoursBanner;
