import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useMoneyAccountDepositPaymentMethods } from '../../../../UI/Ramp/hooks/useMoneyAccountDepositPaymentMethods';
import { pickEligiblePaymentMethod } from '../../../../UI/Ramp/utils/pickEligiblePaymentMethod';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { hasTransactionType } from '../../utils/transaction';

/**
 * Returns whether the fiat deposit path is available for a moneyAccountDeposit
 * transaction in the user's current region, based on the asset's best provider
 * and its payment methods' settlement delays.
 *
 * A region is considered available when the asset's provider returns at least
 * one payment method whose upper-bound delay does not exceed the configured
 * threshold (`confirmations_pay_fiat.maxDelayMinutesForPaymentMethods`).
 *
 * For non-moneyAccountDeposit transactions, always returns available so callers
 * can use this hook unconditionally.
 *
 * @returns `{ isAvailable, isLoading }` — `isAvailable` is optimistically
 * `true` while loading, flipping to `false` once the provider query settles
 * with no eligible methods.
 */
export function useIsMoneyAccountDepositFiatAvailable(): {
  isAvailable: boolean;
  isLoading: boolean;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const fiatPayment = useTransactionPayFiatPayment();
  const { maxDelayMinutesForPaymentMethods } = useMMPayFiatConfig();
  const { paymentMethods, isReady, isLoading } =
    useMoneyAccountDepositPaymentMethods(
      isMoneyAccountDeposit ? fiatPayment?.caipAssetId : undefined,
    );

  if (!isMoneyAccountDeposit) {
    return { isAvailable: true, isLoading: false };
  }

  if (isLoading || !isReady) {
    return { isAvailable: true, isLoading: true };
  }

  const eligibleMethod = pickEligiblePaymentMethod(
    paymentMethods,
    maxDelayMinutesForPaymentMethods,
  );

  return { isAvailable: Boolean(eligibleMethod), isLoading: false };
}
