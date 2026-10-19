import { useCallback, useEffect } from 'react';
import {
  isPerpsStackBackAction,
  shouldPopPerpsRoute,
} from '../utils/perpsModeSwitch';

interface DroppedHomeBackEvent {
  preventDefault: () => void;
  data: { action: { type: string } };
}

interface DroppedHomeBackNavigation {
  getState: () => Parameters<typeof shouldPopPerpsRoute>[1];
  addListener: (
    event: 'beforeRemove',
    listener: (event: DroppedHomeBackEvent) => void,
  ) => () => void;
}

/**
 * Shared Back + beforeRemove path for screens that must honour the dropped-Home
 * fallback instead of parent-aware `goBack()` (TAT-3786).
 */
export const usePerpsDroppedHomeBack = ({
  canGoBack,
  navigateBack,
  navigation,
  leaveViaFallback,
}: {
  canGoBack: boolean;
  navigateBack: () => void;
  navigation: DroppedHomeBackNavigation;
  leaveViaFallback: () => void;
}): (() => void) => {
  const handleBackPress = useCallback(() => {
    // Read the stack at press time: Lite -> Pro resets it while this screen
    // stays mounted, so a value captured on render would be stale.
    if (shouldPopPerpsRoute(canGoBack, navigation.getState())) {
      navigateBack();
      return;
    }
    leaveViaFallback();
  }, [canGoBack, leaveViaFallback, navigateBack, navigation]);

  // iOS edge-swipe and Android hardware back skip the header button and go
  // through React Navigation `goBack()`, which is still parent-aware.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isPerpsStackBackAction(e.data.action.type)) {
        return;
      }
      if (shouldPopPerpsRoute(canGoBack, navigation.getState())) {
        return;
      }
      e.preventDefault();
      leaveViaFallback();
    });
    return unsubscribe;
  }, [canGoBack, leaveViaFallback, navigation]);

  return handleBackPress;
};
