import { TransactionType } from '@metamask/transaction-controller';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { encodeWrap } from '../protocol/orderCodec';
import { OperationType, type SafeTransaction } from '../safe/types';
import { buildSignedSafeExecution, getRawTokenBalance } from './core';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { getCanonicalV2AllowanceRequirements } from './v2AllowanceRequirements';

export interface TradePreflightPlan {
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  safeUsdceBalance: bigint;
  transactions: SafeTransaction[];
}

export async function planTradePreflight({
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
}): Promise<TradePreflightPlan> {
  const missingRequirements = await inspectMissingRequirements({
    address: safeAddress,
    requirements: getCanonicalV2AllowanceRequirements(protocol),
  });
  const safeUsdceBalance = await getRawTokenBalance({
    address: safeAddress,
    tokenAddress: protocol.collateral.legacyUsdceToken,
  });
  const transactions = compileTradePreflightTransactions({
    protocol,
    safeAddress,
    missingRequirements,
    safeUsdceBalance,
  });

  return {
    missingRequirements,
    safeUsdceBalance,
    transactions,
  };
}

export function compileTradePreflightTransactions({
  protocol,
  safeAddress,
  missingRequirements,
  safeUsdceBalance,
}: {
  protocol?: PolymarketProtocolDefinition;
  safeAddress: string;
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  safeUsdceBalance: bigint;
}): SafeTransaction[] {
  const resolvedProtocol = protocol ?? POLYMARKET_V2_PROTOCOL;
  const transactions = compileRequirementTransactions(missingRequirements);

  if (
    safeUsdceBalance > 0n &&
    resolvedProtocol.collateral.onrampAddress !== undefined
  ) {
    transactions.push({
      to: resolvedProtocol.collateral.onrampAddress,
      data: encodeWrap({
        asset: resolvedProtocol.collateral.legacyUsdceToken,
        to: safeAddress,
        amount: safeUsdceBalance,
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  return transactions;
}

export async function buildTradeAllowancesTx({
  signer,
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  signer: Signer;
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
}): Promise<{ to: string; data: string } | undefined> {
  const plan = await planTradePreflight({
    safeAddress,
    protocol,
  });

  if (plan.transactions.length === 0) {
    return undefined;
  }

  const signedExecution = await buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.contractInteraction,
  });

  return {
    to: signedExecution.params.to,
    data: signedExecution.params.data,
  };
}
