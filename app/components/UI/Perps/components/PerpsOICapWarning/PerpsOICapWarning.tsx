import React, { memo } from 'react';
import { View } from 'react-native';
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
import { strings } from '../../../../../../locales/i18n';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import type { PerpsOICapWarningProps } from './PerpsOICapWarning.types';
import styleSheet from './PerpsOICapWarning.styles';

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
          size={IconSize.Md}
          color={IconColor.Default}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text
            variant={isBanner ? TextVariant.BodyMD : TextVariant.BodySM}
            color={TextColor.Default}
          >
            {strings('perps.order.validation.oi_cap_reached')}
          </Text>
        </View>
      </View>
    );
  },
);

PerpsOICapWarning.displayName = 'PerpsOICapWarning';

export default PerpsOICapWarning;
