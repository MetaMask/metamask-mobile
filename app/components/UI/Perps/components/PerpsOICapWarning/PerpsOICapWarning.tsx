import React, { memo } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import type { PerpsOICapWarningProps } from './PerpsOICapWarning.types';

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
    const { isAtCap, isLoading } = usePerpsOICap(symbol);

    if (!isAtCap || isLoading) {
      return null;
    }

    const isBanner = variant === 'banner';

    return (
      <Box testID={testID} twClassName={isBanner ? 'px-4' : undefined}>
        <BannerAlert
          severity={BannerAlertSeverity.Neutral}
          alignItems={isBanner ? BoxAlignItems.Center : BoxAlignItems.Start}
          title={strings('perps.order.validation.oi_cap_reached_title')}
          description={strings(
            'perps.order.validation.oi_cap_reached_description',
          )}
        />
      </Box>
    );
  },
);

PerpsOICapWarning.displayName = 'PerpsOICapWarning';

export default PerpsOICapWarning;
