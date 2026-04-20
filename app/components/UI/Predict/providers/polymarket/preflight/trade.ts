import { TransactionType } from '@metamask/transaction-controller';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import type { SafeTransaction } from '../safe/types';
import {
  buildSignedSafeExecutionIfNeeded,
  compileAllowanceMaintenanceTransactions,
  getRawTokenBalance,
} from './core';
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

  return {
    missingRequirements,
    safeUsdceBalance,
    transactions: compileTradePreflightTransactions({
      protocol,
      safeAddress,
      missingRequirements,
      safeUsdceBalance,
    }),
  };
}

export function compileTradePreflightTransactions({
  protocol = POLYMARKET_V2_PROTOCOL,
  safeAddress,
  missingRequirements,
  safeUsdceBalance,
}: {
  protocol?: PolymarketProtocolDefinition;
  safeAddress: string;
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  safeUsdceBalance: bigint;
}): SafeTransaction[] {
  return compileAllowanceMaintenanceTransactions({
    protocol,
    safeAddress,
    missingRequirements,
    usdceBalance: safeUsdceBalance,
  });
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

  const signedExecution = await buildSignedSafeExecutionIfNeeded({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.contractInteraction,
  });

  return signedExecution?.params;
}
