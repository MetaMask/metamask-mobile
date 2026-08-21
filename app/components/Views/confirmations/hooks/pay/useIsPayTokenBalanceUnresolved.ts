import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { useTransactionPayIsPostQuote } from './useTransactionPayData';
import { useTransactionPaySelectedFiatPaymentMethod } from './useTransactionPaySelectedFiatPaymentMethod';
import { useTransactionPayToken } from './useTransactionPayToken';

/**
 * Whether a crypto pay-token USD balance is still missing.
 *
 * `useInsufficientPayTokenBalanceAlert` skips blocking alerts while the
 * live balance is `undefined` so an unknown value is not treated as zero.
 * Continue / confirm CTAs must still fail closed for that window.
 *
 * Fiat, money-account, and post-quote (withdrawal) flows do not wait on
 * this source.
 */
export function useIsPayTokenBalanceUnresolved(): boolean {
  const { payToken } = useTransactionPayToken();
  const { balanceUsd } = usePayTokenAccountBalance();
  const isPostQuote = useTransactionPayIsPostQuote();
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyPaymentOverride =
    paymentOverride === PaymentOverride.MoneyAccount;

  if (
    !payToken ||
    isPostQuote ||
    Boolean(selectedFiatPaymentMethod) ||
    isMoneyPaymentOverride
  ) {
    return false;
  }

  return balanceUsd === undefined;
}
