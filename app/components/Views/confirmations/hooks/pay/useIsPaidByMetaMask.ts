import { TransactionType } from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import {
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from './useTransactionPayData';

const SUPPORTED_TYPES = [TransactionType.musdConversion];

export function useIsPaidByMetaMask(): boolean {
  const totals = useTransactionPayTotals();
  const quotes = useTransactionPayQuotes();
  const transactionMetadata = useTransactionMetadataOrThrow();

  if (
    !quotes?.length ||
    !totals?.fees ||
    !hasTransactionType(transactionMetadata, SUPPORTED_TYPES)
  ) {
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
