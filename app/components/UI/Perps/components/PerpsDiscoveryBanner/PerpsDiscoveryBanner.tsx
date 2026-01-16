import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import { Image, StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { useStyles } from '../../../../../component-library/hooks';
import type { PerpsDiscoveryBannerProps } from './PerpsDiscoveryBanner.types';

// eslint-disable-next-line import/no-commonjs, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const perpsLogo = require('../../../../../images/perps-home-empty-state.png');

const styleSheet = () =>
  StyleSheet.create({
    container: {
      marginTop: 8,
      paddingHorizontal: 16,
    },
    banner: {
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    textContainer: {
      flex: 1,
      marginLeft: 12,
    },
    perpsLogo: {
      width: 32,
      height: 32,
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
      <Box style={styles.container}>
        <Box
          style={styles.banner}
          backgroundColor={BoxBackgroundColor.BackgroundMuted}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Image
              source={perpsLogo}
              style={styles.perpsLogo}
              testID={`${testID}-logo`}
            />
            <Box style={styles.textContainer}>
              <Text variant={TextVariant.BodyMd}>
                {strings('perps.discovery_banner.title', { symbol })}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('perps.discovery_banner.subtitle', {
                  leverage: maxLeverage,
                })}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
};

export default PerpsDiscoveryBanner;
