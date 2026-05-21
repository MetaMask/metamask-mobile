import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxBackgroundColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import type { PerpsDiscoveryBannerProps } from './PerpsDiscoveryBanner.types';

// eslint-disable-next-line import-x/no-commonjs, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const perpsLogo = require('../../../../../images/perps-home-empty-state.png');

const LOGO_CONTAINER_SIZE = 72;

const styleSheet = () =>
  StyleSheet.create({
    outer: {
      marginTop: 8,
      paddingHorizontal: 16,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderRadius: 12,
      padding: 16,
    },
    logoContainer: {
      width: LOGO_CONTAINER_SIZE,
      height: LOGO_CONTAINER_SIZE,
      borderRadius: 12,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    perpsLogo: {
      width: LOGO_CONTAINER_SIZE,
      height: LOGO_CONTAINER_SIZE,
    },
    textContainer: {
      flex: 1,
      gap: 4,
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
    <Pressable onPress={onPress} testID={testID}>
      <Box style={styles.outer}>
        <Box
          style={styles.banner}
          backgroundColor={BoxBackgroundColor.BackgroundMuted}
        >
          <Box
            style={styles.logoContainer}
            backgroundColor={BoxBackgroundColor.BackgroundMuted}
            testID={`${testID}-logo-container`}
          >
            <Image
              source={perpsLogo}
              style={styles.perpsLogo}
              resizeMode="contain"
              testID={`${testID}-logo`}
            />
          </Box>
          <Box style={styles.textContainer}>
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
        </Box>
      </Box>
    </Pressable>
  );
};

export default PerpsDiscoveryBanner;
