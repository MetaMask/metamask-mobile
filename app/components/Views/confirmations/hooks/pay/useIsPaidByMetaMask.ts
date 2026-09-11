import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
  useTransactionPayTotals,
} from './useTransactionPayData';

export function useIsPaidByMetaMask(): boolean {
  const { selectedPaymentMethodId } = useTransactionPayFiatPayment() || {};
  const totals = useTransactionPayTotals();
  const quotes = useTransactionPayQuotes();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const transactionMeta = useTransactionMetadataRequest();

  if (selectedPaymentMethodId) {
    return false;
  }

  // Mirror the fee row's sponsored $0 display (pre-quote, gasless).
  if (transactionMeta?.isGasFeeSponsored && !sourceAmounts?.length) {
    return true;
  }

  if (!quotes?.length || !totals?.fees) {
    return false;
  }

  const sourceNetwork = new BigNumber(totals.fees.sourceNetwork.estimate.usd);
  const targetNetwork = new BigNumber(totals.fees.targetNetwork.usd);
  const provider = new BigNumber(totals.fees.provider.usd);
  const metaMask = new BigNumber(totals.fees.metaMask.usd ?? 0);

  return (
    sourceNetwork.plus(targetNetwork).isZero() &&
    provider.isZero() &&
    metaMask.isZero()
  );
}
