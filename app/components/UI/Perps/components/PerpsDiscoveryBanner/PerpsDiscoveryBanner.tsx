import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import type { PerpsDiscoveryBannerProps } from './PerpsDiscoveryBanner.types';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      marginTop: 8,
      paddingHorizontal: 16,
    },
    banner: {
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
  });

/**
 * PerpsDiscoveryBanner - A promotional banner for Perps trading discovery
 *
 * Displayed on spot asset detail screens when the asset has an available
 * perpetual futures market. Allows users to navigate to the perps trading screen.
 *
 * @example
 * ```tsx
 * <PerpsDiscoveryBanner
 *   symbol="ETH"
 *   maxLeverage="40x"
 *   onPress={() => navigateToMarketDetails(marketData, 'asset_detail_screen')}
 * />
 * ```
 */
const PerpsDiscoveryBanner: React.FC<PerpsDiscoveryBannerProps> = ({
  symbol,
  maxLeverage,
  onPress,
  testID = 'perps-discovery-banner',
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Pressable onPress={onPress} style={styles.container} testID={testID}>
      <Box
        style={styles.banner}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <AvatarIcon
            iconName={IconName.Infinity}
            severity={AvatarIconSeverity.Neutral}
            size={AvatarIconSize.Lg}
            iconProps={{ color: IconColor.IconDefault }}
            twClassName="shrink-0"
            testID={`${testID}-logo`}
          />
          <Box twClassName="min-w-0 flex-1 gap-0.5">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('perps.discovery_banner.title', { symbol })}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('perps.discovery_banner.subtitle', {
                leverage: maxLeverage,
              })}
            </Text>
          </Box>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </Box>
    </Pressable>
  );
};

export default PerpsDiscoveryBanner;
