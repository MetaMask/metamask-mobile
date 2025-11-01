import React, { useCallback, useEffect, useRef } from 'react';
import PerpsNotificationBottomSheet from '../PerpsNotificationBottomSheet';
import { usePerpsNotificationTooltip } from '../../hooks/usePerpsNotificationTooltip';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { PerpsOrderViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

export interface PerpsNotificationTooltipProps {
  /**
   * Whether a successful order was just placed
   * This triggers the tooltip to show if conditions are met
   */
  orderSuccess?: boolean;

  /**
   * Callback called when tooltip is completed (closed after first order)
   */
  onComplete?: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}

/**
 * Perps Notification Tooltip Component
 *
 * Shows tooltip encouraging users to enable perps notifications on their first successful order.
 * Once shown and closed, never appears again.
 *
 * Shows when:
 * - User has never placed a successful perps order before
 * - Perps notifications are currently disabled
 * - A successful order was just placed
 */
const PerpsNotificationTooltip = ({
  orderSuccess = false,
  onComplete,
  testID = PerpsOrderViewSelectorsIDs.NOTIFICATION_TOOLTIP,
}: PerpsNotificationTooltipProps) => {
  const {
    isVisible,
    shouldShowTooltip,
    showTooltip,
    hideTooltip,
    markFirstOrderCompleted,
    hasPlacedFirstOrder,
  } = usePerpsNotificationTooltip();

  // Track whether we've already processed this order success to prevent duplicate onComplete calls
  const processedOrderSuccessRef = useRef(false);

  /**
   * Reset processed flag when orderSuccess changes from true to false
   */
  useEffect(() => {
    if (!orderSuccess) {
      processedOrderSuccessRef.current = false;
    }
  }, [orderSuccess]);

  /**
   * Show tooltip when order is successful and conditions are met
   * Also mark first order as completed to never show again
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    // Prevent processing the same order success multiple times
    if (orderSuccess && processedOrderSuccessRef.current) {
      return;
    }

    if (orderSuccess && shouldShowTooltip) {
      processedOrderSuccessRef.current = true;
      DevLogger.log(
        'PerpsNotificationTooltip: First order success, showing tooltip',
        {
          orderSuccess,
          shouldShowTooltip,
          timestamp: new Date().toISOString(),
        },
      );
      timeoutId = setTimeout(() => {
        showTooltip();
      }, 3000);
    } else if (orderSuccess) {
      processedOrderSuccessRef.current = true;
      // mark first order as completed if it's the first order
      // regardless of if tooltip is shown or not
      if (!hasPlacedFirstOrder) {
        markFirstOrderCompleted();
      }
      // Call completion callback
      if (onComplete) {
        onComplete();
      }
    }

    // Cleanup function to prevent memory leaks and calls on unmounted components
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    orderSuccess,
    shouldShowTooltip,
    showTooltip,
    markFirstOrderCompleted,
    onComplete,
    hasPlacedFirstOrder,
  ]);

  /**
   * Handle tooltip close
   */
  const handleClose = useCallback(() => {
    DevLogger.log('PerpsNotificationTooltip: User closed tooltip', {
      timestamp: new Date().toISOString(),
    });
    hideTooltip();
    markFirstOrderCompleted();
    // Call completion callback to execute delayed navigation
    if (onComplete) {
      onComplete();
    }
  }, [hideTooltip, onComplete, markFirstOrderCompleted]);

  // Don't render if conditions aren't met
  if (!shouldShowTooltip && !isVisible) {
    return null;
  }

  return (
    <PerpsNotificationBottomSheet
      isVisible={isVisible}
      onClose={handleClose}
      testID={testID}
    />
  );
};

export default PerpsNotificationTooltip;
