import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { OperationType, type SafeTransaction } from '../safe/types';
import { getPreValidatedSafeTransactionCallData } from '../safe/utils';
import { encodeErc20Transfer } from '../utils';
import {
  aggregateSafeTransactions,
  buildSignedSafeExecution,
  compileAllowanceMaintenanceTransactions,
  getRawTokenBalance,
} from './core';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
  getActiveV2AllowanceRequirements,
  getCanonicalV2AllowanceRequirements,
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
  const requirements =
    safeLegacyUsdceBalance > 0n
      ? getCanonicalV2AllowanceRequirements(protocol)
      : getActiveV2AllowanceRequirements(protocol);
  const missingRequirements = await inspectMissingRequirements({
    address: safeAddress,
    requirements,
  });

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

/**
 * Builds the same Safe withdraw call as `buildWithdrawTransaction`, but with a
 * pre-validated owner signature instead of a real one. Use it to simulate the
 * withdraw from the owner before the user signs.
 *
 * @param params - The parameters.
 * @param params.signer - The Safe owner.
 * @param params.safeAddress - The Safe address.
 * @param params.requestedAmountRaw - The pUSD amount to withdraw, in raw units.
 * @param params.protocol - The Polymarket protocol definition.
 * @param params.safeLegacyUsdceBalance - The Safe's legacy USDC.e balance, if known.
 * @returns The `to` and `data` of the Safe call.
 */
export async function buildUnsignedWithdrawTransaction({
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
}): Promise<{ to: Hex; data: Hex }> {
  const plan = await planWithdraw({
    signer,
    safeAddress,
    requestedAmountRaw,
    protocol,
    safeLegacyUsdceBalance,
  });

  return {
    to: safeAddress as Hex,
    data: getPreValidatedSafeTransactionCallData({
      ownerAddress: signer.address,
      txn: aggregateSafeTransactions(plan.transactions),
    }),
  };
}
