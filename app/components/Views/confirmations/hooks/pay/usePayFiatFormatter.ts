import { hasTransactionType } from '@metamask/transaction-controller';

import { useTransactionDetails } from '../activity/useTransactionDetails';
import {
  ACTIVITY_FIAT_FRACTION_DIGITS,
  USER_CURRENCY_TYPES,
} from '../../constants/confirmations';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';

/**
 * Hook that returns the appropriate fiat formatter based on transaction type.
 *
 * For transaction types in USER_CURRENCY_TYPES (e.g., musdClaim), uses the user's
 * selected currency. For all other types, uses USD.
 *
 * @returns A fiat formatter function
 */
export function usePayFiatFormatter() {
  const formatFiatUsd = useFiatFormatter({
    currency: 'usd',
    fractionDigits: ACTIVITY_FIAT_FRACTION_DIGITS,
  });
  const formatFiatUser = useFiatFormatter({
    fractionDigits: ACTIVITY_FIAT_FRACTION_DIGITS,
  });
  const { transactionMeta } = useTransactionDetails();

  const useUserCurrency = hasTransactionType(
    transactionMeta,
    USER_CURRENCY_TYPES,
  );

  return useUserCurrency ? formatFiatUser : formatFiatUsd;
}
