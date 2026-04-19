import { TransactionType } from '@metamask/transaction-controller';
import { parseUnits } from 'ethers/lib/utils';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
  type WithdrawExecutionMode,
} from '../protocol/definitions';
import { encodeUnwrap } from '../protocol/orderCodec';
import { OperationType, type SafeTransaction } from '../safe/types';
import { encodeErc20Transfer } from '../utils';
import { buildSignedSafeExecution, getRawTokenBalance } from './core';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { getCanonicalV2AllowanceRequirements } from './v2AllowanceRequirements';

export interface WithdrawPlan {
  requestedAmountRaw: bigint;
  safeUsdceBalance: bigint;
  deficit: bigint;
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  transactions: SafeTransaction[];
}

export async function planWithdraw({
  signer,
  safeAddress,
  requestedAmount,
  mode,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  signer: Signer;
  safeAddress: string;
  requestedAmount: number;
  mode: WithdrawExecutionMode;
  protocol?: PolymarketProtocolDefinition;
}): Promise<WithdrawPlan> {
  const requestedAmountRaw = BigInt(
    parseUnits(requestedAmount.toString(), 6).toString(),
  );
  const [missingRequirements, safeUsdceBalance] = await Promise.all([
    inspectMissingRequirements({
      address: safeAddress,
      requirements: getCanonicalV2AllowanceRequirements(protocol),
    }),
    getRawTokenBalance({
      address: safeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    }),
  ]);

  const deficit =
    mode === 'usdce-deficit-unwrap' && requestedAmountRaw > safeUsdceBalance
      ? requestedAmountRaw - safeUsdceBalance
      : 0n;

  return {
    requestedAmountRaw,
    safeUsdceBalance,
    deficit,
    missingRequirements,
    transactions: compileWithdrawTransactions({
      signer,
      safeAddress,
      requestedAmountRaw,
      deficit,
      missingRequirements,
      mode,
      protocol,
    }),
  };
}

export function compileWithdrawTransactions({
  signer,
  safeAddress,
  requestedAmountRaw,
  deficit,
  missingRequirements,
  mode,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  signer: Signer;
  safeAddress: string;
  requestedAmountRaw: bigint;
  deficit: bigint;
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  mode: WithdrawExecutionMode;
  protocol?: PolymarketProtocolDefinition;
}): SafeTransaction[] {
  const transactions = compileRequirementTransactions(missingRequirements);

  if (mode === 'pusd-transfer') {
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

  if (deficit > 0n && protocol.collateral.offrampAddress !== undefined) {
    transactions.push({
      to: protocol.collateral.offrampAddress,
      data: encodeUnwrap({
        asset: protocol.collateral.legacyUsdceToken,
        to: safeAddress,
        amount: deficit,
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  transactions.push({
    to: protocol.collateral.legacyUsdceToken,
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
  requestedAmount,
  mode,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  signer: Signer;
  safeAddress: string;
  requestedAmount: number;
  mode: WithdrawExecutionMode;
  protocol?: PolymarketProtocolDefinition;
}) {
  const plan = await planWithdraw({
    signer,
    safeAddress,
    requestedAmount,
    mode,
    protocol,
  });

  return buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.predictWithdraw,
  });
}
