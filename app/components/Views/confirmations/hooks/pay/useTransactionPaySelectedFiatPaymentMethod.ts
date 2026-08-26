import { useMemo } from 'react';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useFiatDepositPaymentMethods } from './useFiatDepositPaymentMethods';

export function useTransactionPaySelectedFiatPaymentMethod():
  | PaymentMethod
  | undefined {
  const fiatPayment = useTransactionPayFiatPayment();
  const { paymentMethods } = useFiatDepositPaymentMethods();

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
