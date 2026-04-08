import { useMemo } from 'react';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

export function useTransactionPaySelectedFiatPaymentMethod():
  | PaymentMethod
  | undefined {
  const fiatPayment = useTransactionPayFiatPayment();
  const { paymentMethods } = useRampsPaymentMethods();

  return useMemo(
    () =>
      fiatPayment?.selectedPaymentMethodId
        ? paymentMethods.find(
            (pm) => pm.id === fiatPayment.selectedPaymentMethodId,
          )
        : undefined,
    [fiatPayment?.selectedPaymentMethodId, paymentMethods],
  );
}
