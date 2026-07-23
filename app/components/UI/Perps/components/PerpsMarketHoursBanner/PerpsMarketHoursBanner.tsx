import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getMarketHoursStatus, isEquityAsset } from '../../utils/marketHours';
import type { PerpsMarketHoursBannerProps } from './PerpsMarketHoursBanner.types';

const PerpsMarketHoursBanner: React.FC<PerpsMarketHoursBannerProps> = ({
  marketType,
  onInfoPress,
  testID = 'perps-market-hours-banner',
}) => {
  // Check if this is an equity asset
  const shouldDisplay = useMemo(() => isEquityAsset(marketType), [marketType]);

  // Get current market hours status - recalculated on each render to stay current
  const marketHoursStatus = getMarketHoursStatus();

  // Don't render if not an equity asset
  if (!shouldDisplay) {
    return null;
  }

  // Determine text based on market hours
  const titleText = marketHoursStatus.isOpen
    ? strings('perps.market.trading_24_7')
    : strings('perps.market.after_hours_trading_banner');

  const subtitleText = marketHoursStatus.isOpen
    ? strings('perps.market.expect_more_volatility')
    : strings('perps.market.pay_attention_to_volatility');

  return (
    <Box twClassName="px-4 mb-4">
      <BannerAlert
        severity={BannerAlertSeverity.Neutral}
        startAccessory={
          <Icon
            name={IconName.Clock}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
          />
        }
        title={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {titleText}
            </Text>
            <ButtonIcon
              iconName={IconName.Info}
              size={ButtonIconSize.Sm}
              onPress={onInfoPress}
              accessibilityLabel={titleText}
              testID={`${testID}-info-button`}
            />
          </Box>
        }
        description={subtitleText}
        testID={testID}
      />
    </Box>
  );
};

export default PerpsMarketHoursBanner;
