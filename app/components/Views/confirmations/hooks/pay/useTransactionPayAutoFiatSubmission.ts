import { createProjectLogger } from '@metamask/utils';
import { useEffect, useRef } from 'react';

import { useTransactionConfirm } from '../transactions/useTransactionConfirm';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

const log = createProjectLogger('transaction-pay-auto-fiat-submission');

/**
 * Automatically submits transaction confirmation once a quick-buy order ID
 * is available for the selected fiat payment method.
 *
 * Submission is deduplicated by order ID and retriggered only for a new order.
 */
export function useTransactionPayAutoFiatSubmission(): void {
  const { onConfirm } = useTransactionConfirm();
  const fiatPayment = useTransactionPayFiatPayment();
  const submittedOrderIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
    const quickBuyOrderId = fiatPayment?.quickBuyOrderId;

    if (!selectedPaymentMethodId || !quickBuyOrderId) {
      return;
    }

    if (submittedOrderIdsRef.current.has(quickBuyOrderId)) {
      return;
    }

    submittedOrderIdsRef.current.add(quickBuyOrderId);

    onConfirm().catch((error) => {
      submittedOrderIdsRef.current.delete(quickBuyOrderId);
      log('Failed to auto-submit fiat transaction', error);
    });
  }, [
    fiatPayment?.quickBuyOrderId,
    fiatPayment?.selectedPaymentMethodId,
    onConfirm,
  ]);
}
