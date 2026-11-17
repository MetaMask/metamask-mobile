import React from 'react';
import PaymentFailedSheet from '../PaymentFailedSheet';
import { useProSubscriptionPaymentMonitor } from '../../hooks/useProSubscriptionPaymentMonitor';

/**
 * App-wide watcher for a membership payment that is still bridging or
 * on-ramping. Toasts come from the shared toast host. A failed payment
 * mounts the payment-failed sheet, which draws above the root stack.
 * Returning null while it is closed keeps that iOS overlay unmounted.
 */
const ProSubscriptionPaymentMonitor: React.FC = () => {
  const { isPaymentFailedSheetOpen, closePaymentFailedSheet } =
    useProSubscriptionPaymentMonitor();

  if (!isPaymentFailedSheetOpen) {
    return null;
  }

  return <PaymentFailedSheet onClose={closePaymentFailedSheet} />;
};

export default ProSubscriptionPaymentMonitor;
