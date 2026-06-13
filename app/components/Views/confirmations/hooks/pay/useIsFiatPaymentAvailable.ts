import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useHasNativeFiatProvider } from '../../../../UI/Ramp/hooks/useHasNativeFiatProvider';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';

/**
 * Returns whether fiat payment is available for the current transaction.
 * True when the transaction type is fiat-enabled via remote feature flags,
 * at least one Ramps payment method exists, AND the region has a native
 * on-ramp provider (headless fiat deposit is native-only for v0).
 */
export function useIsFiatPaymentAvailable(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const hasNativeFiatProvider = useHasNativeFiatProvider();

  return (
    hasTransactionType(transactionMeta, enabledTransactionTypes) &&
    paymentMethods.length > 0 &&
    hasNativeFiatProvider
  );
}
