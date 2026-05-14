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
import {
  getActiveV2AllowanceRequirements,
  getCanonicalV2AllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

export interface TradePreflightPlan {
  missingRequirements: V2AllowanceRequirement[];
  safeUsdceBalance: bigint;
  transactions: SafeTransaction[];
}

export async function planTradePreflight({
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  safeUsdceBalance: providedSafeUsdceBalance,
}: {
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
  safeUsdceBalance?: bigint;
}): Promise<TradePreflightPlan> {
  const safeUsdceBalance =
    providedSafeUsdceBalance ??
    (await getRawTokenBalance({
      address: safeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    }));
  const requirements =
    safeUsdceBalance > 0n
      ? getCanonicalV2AllowanceRequirements(protocol)
      : getActiveV2AllowanceRequirements(protocol);
  const missingRequirements = await inspectMissingRequirements({
    address: safeAddress,
    requirements,
  });

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
  missingRequirements: V2AllowanceRequirement[];
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
  safeUsdceBalance,
}: {
  signer: Signer;
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
  safeUsdceBalance?: bigint;
}): Promise<{ to: string; data: string } | undefined> {
  const plan = await planTradePreflight({
    safeAddress,
    protocol,
    safeUsdceBalance,
  });

  const signedExecution = await buildSignedSafeExecutionIfNeeded({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.contractInteraction,
  });

  return signedExecution?.params;
}
