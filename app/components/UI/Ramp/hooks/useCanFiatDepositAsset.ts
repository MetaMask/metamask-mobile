import { useMoneyAccountDepositPaymentMethods } from './useMoneyAccountDepositPaymentMethods';
import { pickEligiblePaymentMethod } from '../utils/pickEligiblePaymentMethod';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';

/**
 * Returns true only when fiat deposit is flag-enabled AND the user's region
 * has at least one eligible payment method (provider resolved + method delay
 * within the configured threshold).
 *
 * Fails closed: returns false while queries are loading or on network error.
 * Only one production consumer: MoneyAddMoneySheet.
 */
export function useCanFiatDepositAsset({
  isFiatDepositFlagEnabled,
}: {
  isFiatDepositFlagEnabled: boolean;
}): boolean {
  const { paymentMethods, isReady } = useMoneyAccountDepositPaymentMethods();
  const { maxDelayMinutesForPaymentMethods } = useMMPayFiatConfig();

  if (!isFiatDepositFlagEnabled || !isReady) return false;

  return (
    pickEligiblePaymentMethod(paymentMethods, maxDelayMinutesForPaymentMethods) !=
    null
  );
}

export default useCanFiatDepositAsset;
