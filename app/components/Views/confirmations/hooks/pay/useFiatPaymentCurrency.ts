import { useMemo } from 'react';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useRampsController } from '../../../../UI/Ramp/hooks/useRampsController';

export function useFiatPaymentCurrency() {
  const fiatPayment = useTransactionPayFiatPayment();
  const { userRegion } = useRampsController();

  const isFiatPaymentSelected = fiatPayment?.selectedPaymentMethodId !== null;

  const currency = useMemo(() => {
    if (!isFiatPaymentSelected) {
      return null;
    }

    return userRegion?.country?.currency?.toLowerCase();
  }, [isFiatPaymentSelected, userRegion]);

  return currency;
}
