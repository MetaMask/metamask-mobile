import { TransactionType } from '@metamask/transaction-controller';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { OperationType, type SafeTransaction } from '../safe/types';
import { encodeErc20Transfer } from '../utils';
import {
  buildSignedSafeExecution,
  compileAllowanceMaintenanceTransactions,
  getRawTokenBalance,
} from './core';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
  getLegacySweepAllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

export interface WithdrawPlan {
  requestedAmountRaw: bigint;
  safeLegacyUsdceBalance: bigint;
  missingRequirements: V2AllowanceRequirement[];
  transactions: SafeTransaction[];
}

export async function planWithdraw({
  signer,
  safeAddress,
  requestedAmountRaw,
  protocol = POLYMARKET_V2_PROTOCOL,
  safeLegacyUsdceBalance: providedSafeLegacyUsdceBalance,
}: {
  signer: Signer;
  safeAddress: string;
  requestedAmountRaw: bigint;
  protocol?: PolymarketProtocolDefinition;
  safeLegacyUsdceBalance?: bigint;
}): Promise<WithdrawPlan> {
  const safeLegacyUsdceBalance =
    providedSafeLegacyUsdceBalance ??
    (await getRawTokenBalance({
      address: safeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    }));
  const missingRequirements =
    safeLegacyUsdceBalance > 0n
      ? await inspectMissingRequirements({
          address: safeAddress,
          requirements: getLegacySweepAllowanceRequirements(protocol),
        })
      : [];

  return {
    requestedAmountRaw,
    safeLegacyUsdceBalance,
    missingRequirements,
    transactions: compileWithdrawTransactions({
      signer,
      safeAddress,
      requestedAmountRaw,
      missingRequirements,
      safeLegacyUsdceBalance,
      protocol,
    }),
  };
}

function compileWithdrawTransactions({
  signer,
  requestedAmountRaw,
  safeAddress,
  missingRequirements,
  safeLegacyUsdceBalance,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  signer: Signer;
  safeAddress: string;
  requestedAmountRaw: bigint;
  missingRequirements: V2AllowanceRequirement[];
  safeLegacyUsdceBalance: bigint;
  protocol?: PolymarketProtocolDefinition;
}): SafeTransaction[] {
  const transactions = compileAllowanceMaintenanceTransactions({
    protocol,
    safeAddress,
    missingRequirements,
    usdceBalance: safeLegacyUsdceBalance,
  });

  transactions.push({
    to: protocol.collateral.tradingToken,
    data: encodeErc20Transfer({
      to: signer.address,
      value: requestedAmountRaw,
    }),
    operation: OperationType.Call,
    value: '0',
  });

  return transactions;
}

export async function buildWithdrawTransaction({
  signer,
  safeAddress,
  requestedAmountRaw,
  protocol = POLYMARKET_V2_PROTOCOL,
  safeLegacyUsdceBalance,
}: {
  signer: Signer;
  safeAddress: string;
  requestedAmountRaw: bigint;
  protocol?: PolymarketProtocolDefinition;
  safeLegacyUsdceBalance?: bigint;
}) {
  const plan = await planWithdraw({
    signer,
    safeAddress,
    requestedAmountRaw,
    protocol,
    safeLegacyUsdceBalance,
  });

  return buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.predictWithdraw,
  });
}
