import { createProjectLogger } from '@metamask/utils';
import { useEffect, useRef } from 'react';

import { useTransactionConfirm } from '../transactions/useTransactionConfirm';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

const log = createProjectLogger('transaction-pay-auto-fiat-submission');

/**
 * Automatically submits transaction confirmation once an order code
 * is available for the selected fiat payment method.
 *
 * Submission is deduplicated by order code and retriggered only for a new order.
 */
export function useTransactionPayAutoFiatSubmission(): void {
  const { onConfirm } = useTransactionConfirm();
  const fiatPayment = useTransactionPayFiatPayment();
  const submittedOrderCodesRef = useRef(new Set<string>());

  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const orderId = fiatPayment?.orderId as string | undefined;

  useEffect(() => {
    if (!selectedPaymentMethodId || !orderId) {
      return;
    }

    if (submittedOrderCodesRef.current.has(orderId)) {
      return;
    }

    submittedOrderCodesRef.current.add(orderId);

    onConfirm({
      existingOrderId: orderId,
    }).catch((error) => {
      submittedOrderCodesRef.current.delete(orderId);
      log('Failed to auto-submit fiat transaction', error);
    });
  }, [orderId, selectedPaymentMethodId, onConfirm]);
}
