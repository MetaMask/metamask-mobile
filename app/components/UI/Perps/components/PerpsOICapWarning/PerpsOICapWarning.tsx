import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';

export interface PerpsOICapWarningProps {
  /** Market symbol to check OI cap status for */
  symbol: string;
  /** Variant determines the display style */
  variant?: 'inline' | 'banner';
  /** Optional test ID for testing */
  testID?: string;
}

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    bannerContainer: {
      backgroundColor: colors.warning.muted,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.warning.default,
    },
    inlineContainer: {
      paddingVertical: 8,
    },
    icon: {
      marginTop: 2,
    },
    textContainer: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontWeight: '600',
    },
    description: {
      lineHeight: 18,
    },
  });
};

/**
 * Reusable component that displays a warning when a market is at its open interest cap
 *
 * **Performance:**
 * - Zero network overhead (uses existing webData2 WebSocket)
 * - Memoized to prevent unnecessary re-renders
 * - Multiple instances share the same subscription
 * - Returns null immediately if not at cap (no DOM overhead)
 *
 * @example
 * ```tsx
 * // Inline warning in order form
 * <PerpsOICapWarning symbol="BTC" variant="inline" />
 *
 * // Banner warning in market details
 * <PerpsOICapWarning symbol="xyz:TSLA" variant="banner" />
 * ```
 */
const PerpsOICapWarning: React.FC<PerpsOICapWarningProps> = memo(
  ({ symbol, variant = 'inline', testID = 'perps-oi-cap-warning' }) => {
    const { styles } = useStyles(styleSheet, {});
    const { isAtCap, isLoading } = usePerpsOICap(symbol);

    // Early return for performance - don't render anything if not at cap
    if (!isAtCap || isLoading) {
      return null;
    }

    const isBanner = variant === 'banner';

    return (
      <View
        style={[
          styles.container,
          isBanner ? styles.bannerContainer : styles.inlineContainer,
        ]}
        testID={testID}
      >
        <Icon
          name={IconName.Warning}
          size={IconSize.Sm}
          color={IconColor.Warning}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text
            variant={isBanner ? TextVariant.BodyMD : TextVariant.BodySM}
            color={TextColor.Warning}
            style={styles.title}
          >
            Open Interest Cap Reached
          </Text>
          <Text
            variant={TextVariant.BodyXS}
            color={TextColor.Alternative}
            style={styles.description}
          >
            This market is at capacity. New positions cannot be opened until
            open interest decreases.
          </Text>
        </View>
      </View>
    );
  },
);

PerpsOICapWarning.displayName = 'PerpsOICapWarning';

export default PerpsOICapWarning;
