import { useMemo } from 'react';
import { PaymentMethod } from '@metamask/ramps-controller';
import { useRampsController } from '../../../../UI/Ramp/hooks/useRampsController';
import { useTransactionPayFiatPayment } from './useTransactionPayData';

export function useTransactionPaySelectedFiatPaymentMethod():
  | PaymentMethod
  | undefined {
  const fiatPayment = useTransactionPayFiatPayment();
  const { paymentMethods } = useRampsController();
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

  return useMemo(() => {
    if (!selectedPaymentMethodId) {
      return undefined;
    }

    return paymentMethods.find(
      (paymentMethod) => paymentMethod.id === selectedPaymentMethodId,
    );
  }, [paymentMethods, selectedPaymentMethodId]);
}
