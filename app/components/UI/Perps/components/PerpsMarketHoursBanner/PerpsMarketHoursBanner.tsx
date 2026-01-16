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
  BoxBackgroundColor,
  IconColor,
} from '@metamask/design-system-react-native';
import { StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useStyles } from '../../../../../component-library/hooks';
import { getMarketHoursStatus, isEquityAsset } from '../../utils/marketHours';
import type { PerpsMarketHoursBannerProps } from './PerpsMarketHoursBanner.types';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    banner: {
      // backgroundColor: params.theme.colors.background.alternative,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    contentRow: {
      flex: 1,
      gap: 8,
    },
    textContainer: {
      flex: 1,
    },
  });

const PerpsMarketHoursBanner: React.FC<PerpsMarketHoursBannerProps> = ({
  marketType,
  onInfoPress,
  testID = 'perps-market-hours-banner',
}) => {
  const { styles } = useStyles(styleSheet, {});

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
    <Box style={styles.container} testID={testID}>
      <Box
        style={styles.banner}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            style={styles.contentRow}
          >
            <Icon name={IconName.Clock} size={IconSize.Lg} />
            <Box style={styles.textContainer}>
              <Text variant={TextVariant.BodyMd}>{titleText}</Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {subtitleText}
              </Text>
            </Box>
          </Box>
          <Pressable
            onPress={onInfoPress}
            testID={`${testID}-info-button`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name={IconName.Info}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
          </Pressable>
        </Box>
      </Box>
    </Box>
  );
};

export default PerpsMarketHoursBanner;
