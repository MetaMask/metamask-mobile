import { TransactionType } from '@metamask/transaction-controller';
import type { Signer } from '../../types';
import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
  type PolymarketTradeProtocol,
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
  getLegacySweepAllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

export interface TradePreflightPlan {
  missingRequirements: V2AllowanceRequirement[];
  safeUsdceBalance: bigint;
  transactions: SafeTransaction[];
}

/**
 * The allowances a legacy Safe needs to trade on `tradeProtocol`. The
 * USDC.e wrap stays anchored to the CTF `protocol` because wrapping is a
 * wallet-migration concern, not a protocol one: a legacy Safe trading a v2
 * market still needs its USDC.e wrapped into pUSD through the onramp.
 */
function getTradeAllowanceRequirements({
  protocol,
  tradeProtocol,
  safeUsdceBalance,
}: {
  protocol: PolymarketProtocolDefinition;
  tradeProtocol: PolymarketTradeProtocol;
  safeUsdceBalance: bigint;
}): V2AllowanceRequirement[] {
  if (tradeProtocol.key === 'positions') {
    return [
      ...getPositionsAllowanceRequirements(tradeProtocol),
      ...(safeUsdceBalance > 0n
        ? getLegacySweepAllowanceRequirements(protocol)
        : []),
    ];
  }

  return safeUsdceBalance > 0n
    ? getCanonicalV2AllowanceRequirements(protocol)
    : getActiveV2AllowanceRequirements(protocol);
}

/**
 * Plans the legacy-Safe allowance maintenance for a trade. `protocol` is the
 * CTF definition used for the USDC.e read and wrap; `tradeProtocol` is the
 * protocol the order routes to (by Gamma market version) and defaults to it.
 */
export async function planTradePreflight({
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  tradeProtocol = protocol,
  safeUsdceBalance: providedSafeUsdceBalance,
}: {
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
  tradeProtocol?: PolymarketTradeProtocol;
  safeUsdceBalance?: bigint;
}): Promise<TradePreflightPlan> {
  const safeUsdceBalance =
    providedSafeUsdceBalance ??
    (await getRawTokenBalance({
      address: safeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    }));
  const requirements = getTradeAllowanceRequirements({
    protocol,
    tradeProtocol,
    safeUsdceBalance,
  });
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
  tradeProtocol = protocol,
  safeUsdceBalance,
}: {
  signer: Signer;
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
  tradeProtocol?: PolymarketTradeProtocol;
  safeUsdceBalance?: bigint;
}): Promise<{ to: string; data: string } | undefined> {
  const plan = await planTradePreflight({
    safeAddress,
    protocol,
    tradeProtocol,
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
