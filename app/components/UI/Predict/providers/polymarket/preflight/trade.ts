import { TransactionType } from '@metamask/transaction-controller';
import type { Signer } from '../../types';
import {
  POLYMARKET_POSITIONS_PROTOCOL,
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
import { getPositionsAllowanceRequirements } from './positionsAllowanceRequirements';
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

/**
 * The positions-protocol counterpart of `planTradePreflight`, selected by
 * the Gamma market version. There is no canonical variant — the legacy
 * USDC.e sweep requirement does not exist on the Protocol V2 path. The
 * USDC.e balance read and the wrap stay anchored to the CTF definition
 * because wrapping is a wallet-migration concern, not a protocol one: a
 * legacy Safe trading a v2 market still needs its USDC.e wrapped into pUSD.
 */
export async function planPositionsTradePreflight({
  safeAddress,
  safeUsdceBalance: providedSafeUsdceBalance,
}: {
  safeAddress: string;
  safeUsdceBalance?: bigint;
}): Promise<TradePreflightPlan> {
  const safeUsdceBalance =
    providedSafeUsdceBalance ??
    (await getRawTokenBalance({
      address: safeAddress,
      tokenAddress: POLYMARKET_V2_PROTOCOL.collateral.legacyUsdceToken,
    }));
  const missingRequirements = await inspectMissingRequirements({
    address: safeAddress,
    requirements: getPositionsAllowanceRequirements(
      POLYMARKET_POSITIONS_PROTOCOL,
    ),
  });

  return {
    missingRequirements,
    safeUsdceBalance,
    transactions: compileAllowanceMaintenanceTransactions({
      safeAddress,
      protocol: POLYMARKET_V2_PROTOCOL,
      missingRequirements,
      usdceBalance: safeUsdceBalance,
    }),
  };
}

/**
 * The positions-protocol counterpart of `buildTradeAllowancesTx`, selected
 * by the Gamma market version.
 */
export async function buildPositionsTradeAllowancesTx({
  signer,
  safeAddress,
  safeUsdceBalance,
}: {
  signer: Signer;
  safeAddress: string;
  safeUsdceBalance?: bigint;
}): Promise<{ to: string; data: string } | undefined> {
  const plan = await planPositionsTradePreflight({
    safeAddress,
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
