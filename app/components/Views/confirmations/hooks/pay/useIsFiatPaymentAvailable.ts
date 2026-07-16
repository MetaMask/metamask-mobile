import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useHasFiatProvider } from '../../../../UI/Ramp/hooks/useHasFiatProvider';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';

/**
 * Returns whether fiat payment is available for the current transaction.
 * True when the transaction type is fiat-enabled via remote feature flags,
 * at least one Ramps payment method exists, AND the region has a usable
 * on-ramp provider. Provider availability is flag-aware (see
 * `useHasFiatProvider`): native-only when `moneyHeadlessAllProviders` is off,
 * any provider class when it is on.
 */
export function useIsFiatPaymentAvailable(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const hasFiatProvider = useHasFiatProvider();

  return (
    hasTransactionType(transactionMeta, enabledTransactionTypes) &&
    paymentMethods.length > 0 &&
    hasFiatProvider
  );
}
