import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { encodeUnwrap, encodeWrap } from '../protocol/orderCodec';
import { OperationType, type SafeTransaction } from '../safe/types';
import {
  aggregateTransaction,
  getSafeTransactionCallData,
} from '../safe/utils';
import { getRawBalance } from '../utils';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

export interface SignedSafeExecution {
  params: { to: Hex; data: Hex };
  type: TransactionType;
}

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

export function buildWrapTransaction({
  safeAddress,
  amount,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  safeAddress: string;
  amount: bigint;
  protocol?: PolymarketProtocolDefinition;
}): SafeTransaction | undefined {
  if (amount <= 0n || protocol.collateral.onrampAddress === undefined) {
    return undefined;
  }

  return {
    to: protocol.collateral.onrampAddress,
    data: encodeWrap({
      asset: protocol.collateral.legacyUsdceToken,
      to: safeAddress,
      amount,
    }),
    operation: OperationType.Call,
    value: '0',
  };
}

export function buildUnwrapTransaction({
  recipientAddress,
  amount,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  recipientAddress: string;
  amount: bigint;
  protocol?: PolymarketProtocolDefinition;
}): SafeTransaction | undefined {
  if (amount <= 0n || protocol.collateral.offrampAddress === undefined) {
    return undefined;
  }

  return {
    to: protocol.collateral.offrampAddress,
    data: encodeUnwrap({
      asset: protocol.collateral.legacyUsdceToken,
      to: recipientAddress,
      amount,
    }),
    operation: OperationType.Call,
    value: '0',
  };
}

export function compileAllowanceMaintenanceTransactions({
  safeAddress,
  missingRequirements,
  usdceBalance,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  safeAddress: string;
  missingRequirements: V2AllowanceRequirement[];
  usdceBalance: bigint;
  protocol?: PolymarketProtocolDefinition;
}): SafeTransaction[] {
  const transactions = compileRequirementTransactions(missingRequirements);
  const wrapTransaction = buildWrapTransaction({
    safeAddress,
    amount: usdceBalance,
    protocol,
  });

  if (wrapTransaction) {
    transactions.push(wrapTransaction);
  }

  return transactions;
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
}): Promise<SignedSafeExecution> {
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

export async function buildSignedSafeExecutionIfNeeded({
  signer,
  safeAddress,
  transactions,
  type,
}: {
  signer: Signer;
  safeAddress: string;
  transactions: SafeTransaction[];
  type: TransactionType;
}): Promise<SignedSafeExecution | undefined> {
  if (transactions.length === 0) {
    return undefined;
  }

  return buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions,
    type,
  });
}
