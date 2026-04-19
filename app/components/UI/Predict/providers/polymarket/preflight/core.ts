import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import type { Signer } from '../../types';
import {
  aggregateTransaction,
  getSafeTransactionCallData,
} from '../safe/utils';
import type { SafeTransaction } from '../safe/types';
import { getRawBalance } from '../utils';

export async function getRawTokenBalance({
  address,
  tokenAddress,
}: {
  address: string;
  tokenAddress: string;
}): Promise<bigint> {
  return getRawBalance({ address, tokenAddress });
}

export function aggregateSafeTransactions(
  transactions: SafeTransaction[],
): SafeTransaction {
  return aggregateTransaction(transactions);
}

export async function signSafeTransactions({
  signer,
  safeAddress,
  transactions,
}: {
  signer: Signer;
  safeAddress: string;
  transactions: SafeTransaction[];
}): Promise<Hex> {
  return (await getSafeTransactionCallData({
    signer,
    safeAddress,
    txn: aggregateSafeTransactions(transactions),
  })) as Hex;
}

export async function buildSignedSafeExecution({
  signer,
  safeAddress,
  transactions,
  type,
}: {
  signer: Signer;
  safeAddress: string;
  transactions: SafeTransaction[];
  type: TransactionType;
}): Promise<{
  params: { to: Hex; data: Hex };
  type: TransactionType;
}> {
  const callData = await signSafeTransactions({
    signer,
    safeAddress,
    transactions,
  });

  return {
    params: {
      to: safeAddress as Hex,
      data: callData,
    },
    type,
  };
}
