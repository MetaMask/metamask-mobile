import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  Text,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Pressable } from 'react-native';
import { getMarketHoursStatus, isEquityAsset } from '../../utils/marketHours';
import type { PerpsMarketHoursBannerProps } from './PerpsMarketHoursBanner.types';

const PerpsMarketHoursBanner: React.FC<PerpsMarketHoursBannerProps> = ({
  marketType,
  onInfoPress,
  testID = 'perps-market-hours-banner',
}) => {
  const tw = useTailwind();

  // Check if this is an equity asset
  const shouldDisplay = useMemo(() => isEquityAsset(marketType), [marketType]);

  // Get current market hours status
  const marketHoursStatus = useMemo(() => getMarketHoursStatus(), []);

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
    <Box twClassName="px-4 mb-4" testID={testID}>
      <Box twClassName="bg-alternative rounded-xl px-4 py-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1 gap-2"
          >
            <Icon name={IconName.Clock} size={IconSize.Md} />
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd}>{titleText}</Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="mt-1"
              >
                {subtitleText}
              </Text>
            </Box>
          </Box>
          <Pressable
            onPress={onInfoPress}
            style={({ pressed }) =>
              tw.style('ml-2 p-2 rounded-full', pressed && 'bg-pressed')
            }
            testID={`${testID}-info-button`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name={IconName.Info} size={IconSize.Md} />
          </Pressable>
        </Box>
      </Box>
    </Box>
  );
};

export default PerpsMarketHoursBanner;
