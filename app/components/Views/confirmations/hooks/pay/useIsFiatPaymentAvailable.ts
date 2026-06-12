import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';

/**
 * Returns whether fiat payment is available for the current transaction.
 * True when the transaction type is fiat-enabled via remote feature flags
 * AND at least one Ramps payment method exists.
 */
export function useIsFiatPaymentAvailable(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const { enabledTransactionTypes } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();

  return (
    hasTransactionType(transactionMeta, enabledTransactionTypes) &&
    paymentMethods.length > 0
  );
}
