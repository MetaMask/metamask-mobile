import { useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { usePerpsEventTracking } from '../../../../../UI/Perps/hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../../../../UI/Perps/constants/eventNames';

/**
 * Detect deposit source based on previous screen in navigation stack
 */
const useDepositSource = (): string => {
  const previousRoute = useNavigationState((state) => {
    const routes = state?.routes || [];
    return routes[routes.length - 2]?.name;
  });

  // Map previous screen to appropriate source
  if (previousRoute?.toLowerCase().includes('perp')) {
    if (previousRoute.includes('Market'))
      return PerpsEventValues.SOURCE.PERP_MARKETS;
    if (previousRoute.includes('Asset'))
      return PerpsEventValues.SOURCE.PERP_ASSET_SCREEN;
    if (previousRoute.includes('Order') || previousRoute.includes('Trade'))
      return PerpsEventValues.SOURCE.TRADE_SCREEN;
    if (previousRoute.includes('Position'))
      return PerpsEventValues.SOURCE.POSITION_TAB;
  }

  // Default fallback for portfolio, homescreen, and unknown sources
  return PerpsEventValues.SOURCE.HOMESCREEN_TAB;
};

/**
 * Hook for tracking MetaMetrics events in the deposit flow
 * Follows proper Perps architecture for event tracking with dynamic source detection
 */
export function usePerpsDepositEvents({
  isFullView,
  isPayTokenSelected,
}: {
  isFullView: boolean;
  isPayTokenSelected: boolean;
}) {
  const { track } = usePerpsEventTracking();
  const source = useDepositSource();

  // Track funding input viewed on mount
  useEffect(() => {
    track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.DEPOSIT_INPUT,
      [PerpsEventProperties.SOURCE]: source,
    });
  }, [track, source]);

  // Track funding review viewed when transaction details are ready to review (main's consolidated event)
  useEffect(() => {
    if (isFullView && isPayTokenSelected) {
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PerpsEventProperties.SCREEN_TYPE]:
          PerpsEventValues.SCREEN_TYPE.DEPOSIT_REVIEW,
        [PerpsEventProperties.SOURCE]: source,
      });
    }
  }, [isFullView, isPayTokenSelected, track, source]);
}
