import {
  PAY_TRANSACTION_TYPES,
  USER_CURRENCY_TYPES,
} from '../../constants/confirmations';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const PAY_CURRENCY = 'USD';

/**
 * Returns the fiat currency to use for token/amount displays inside pay-flow
 * confirmations. Pay-flow transactions are priced in USD so quotes stay
 * consistent regardless of the user's preferred currency, except types in
 * {@link USER_CURRENCY_TYPES} (e.g. `musdClaim`) which keep the user's
 * currency. Returns `undefined` outside the pay flow so callers fall back to
 * the user's preferred currency.
 */
export function useTransactionPayCurrency(): string | undefined {
  const transactionMeta = useTransactionMetadataRequest();

  const isPayFlow = hasTransactionType(transactionMeta, PAY_TRANSACTION_TYPES);
  if (!isPayFlow) {
    return undefined;
  }

  const useUserCurrency = hasTransactionType(
    transactionMeta,
    USER_CURRENCY_TYPES,
  );

  return useUserCurrency ? undefined : PAY_CURRENCY;
}
