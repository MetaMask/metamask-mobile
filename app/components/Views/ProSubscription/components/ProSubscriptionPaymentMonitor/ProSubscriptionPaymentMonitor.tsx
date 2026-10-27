import React from 'react';
import PaymentFailedSheet from '../PaymentFailedSheet';
import { useProSubscriptionPaymentMonitor } from '../../hooks/useProSubscriptionPaymentMonitor';

/**
 * App-wide watcher for a membership payment that is still bridging or
 * on-ramping. Toasts come from the shared toast host. A failed payment
 * opens a bottom sheet from this root mount.
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
