import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../../selectors/notifications';
import { selectHasPlacedFirstOrder } from '../controllers/selectors';
import { usePerpsSelector } from './usePerpsSelector';

export interface UsePerpsNotificationTooltipResult {
  /**
   * Whether the tooltip should be shown
   */
  shouldShowTooltip: boolean;
  /**
   * Whether the tooltip is currently visible
   */
  isVisible: boolean;
  /**
   * Function to show the tooltip
   */
  showTooltip: () => void;
  /**
   * Function to hide the tooltip
   */
  hideTooltip: () => void;
  /**
   * Function to mark first order as completed (never show tooltip again)
   */
  markFirstOrderCompleted: () => void;
  /**
   * Whether user has ever placed a successful perps order
   */
  hasPlacedFirstOrder: boolean;
}

/**
 * Hook for managing the perps notification tooltip
 *
 * Shows tooltip to encourage notifications ONLY if:
 * - User has never placed a successful perps order
 * - Perps notifications are currently disabled
 */
export function usePerpsNotificationTooltip(): UsePerpsNotificationTooltipResult {
  const [isVisible, setIsVisible] = useState(false);

  // Get state from Redux selectors
  const isPushNotificationsEnabled = useSelector(
    selectIsMetaMaskPushNotificationsEnabled,
  );
  const hasPlacedFirstOrder = usePerpsSelector(selectHasPlacedFirstOrder);

  const shouldShowTooltip = !hasPlacedFirstOrder && !isPushNotificationsEnabled;

  /**
   * Show the tooltip
   */
  const showTooltip = useCallback(() => {
    if (shouldShowTooltip) {
      setIsVisible(true);
      DevLogger.log(
        'usePerpsNotificationTooltip: Showing notification tooltip',
      );
    }
  }, [shouldShowTooltip]);

  /**
   * Hide the tooltip
   */
  const hideTooltip = useCallback(() => {
    setIsVisible(false);
    DevLogger.log('usePerpsNotificationTooltip: Hiding notification tooltip');
  }, []);

  /**
   * Mark first order as completed (never show tooltip again)
   */
  const markFirstOrderCompleted = useCallback(() => {
    const { PerpsController } = Engine.context;
    PerpsController.markFirstOrderCompleted();
    setIsVisible(false);
    DevLogger.log('usePerpsNotificationTooltip: Marked first order completed');
  }, []);

  return {
    shouldShowTooltip,
    isVisible,
    showTooltip,
    hideTooltip,
    markFirstOrderCompleted,
    hasPlacedFirstOrder,
  };
}
