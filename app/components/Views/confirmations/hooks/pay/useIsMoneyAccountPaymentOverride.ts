import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

/**
 * Returns whether the current transaction is explicitly paying with Money Account.
 */
export function useIsMoneyAccountPaymentOverride(): boolean {
  const transactionId = useTransactionMetadataRequest()?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );

  return paymentOverride === PaymentOverride.MoneyAccount;
}
