import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import {
  useTransactionPayFiatPayment,
  useTransactionPayIsPostQuote,
} from './useTransactionPayData';
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
  // Footer mounts this on every confirmation. Stay on the Redux selector so
  // personal-sign tests do not need a ramps QueryClient.
  const fiatPayment = useTransactionPayFiatPayment();
  const hasFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const isMoneyPaymentOverride =
    paymentOverride === PaymentOverride.MoneyAccount;

  if (!payToken || isPostQuote || hasFiatPayment || isMoneyPaymentOverride) {
    return false;
  }

  return balanceUsd === undefined;
}
