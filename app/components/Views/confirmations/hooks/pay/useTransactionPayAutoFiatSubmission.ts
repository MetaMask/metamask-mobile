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
  // @ts-expect-error orderCode not available until @metamask/transaction-pay-controller dep bump
  const orderCode = fiatPayment?.orderCode as string | undefined;

  useEffect(() => {
    if (!selectedPaymentMethodId || !orderCode) {
      return;
    }

    if (submittedOrderCodesRef.current.has(orderCode)) {
      return;
    }

    submittedOrderCodesRef.current.add(orderCode);

    onConfirm().catch((error) => {
      submittedOrderCodesRef.current.delete(orderCode);
      log('Failed to auto-submit fiat transaction', error);
    });
  }, [orderCode, selectedPaymentMethodId, onConfirm]);
}
