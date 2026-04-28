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
  getLegacySweepAllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

export interface DepositMaintenancePlan {
  missingRequirements: V2AllowanceRequirement[];
  preExistingSafeUsdceBalance: bigint;
  transactions: SafeTransaction[];
}

export async function planDepositMaintenance({
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  preExistingSafeUsdceBalance: providedPreExistingSafeUsdceBalance,
}: {
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
  preExistingSafeUsdceBalance?: bigint;
}): Promise<DepositMaintenancePlan> {
  const preExistingSafeUsdceBalance =
    providedPreExistingSafeUsdceBalance ??
    (await getRawTokenBalance({
      address: safeAddress,
      tokenAddress: protocol.collateral.legacyUsdceToken,
    }));
  const missingRequirements =
    preExistingSafeUsdceBalance > 0n
      ? await inspectMissingRequirements({
          address: safeAddress,
          requirements: getLegacySweepAllowanceRequirements(protocol),
        })
      : [];

  return {
    missingRequirements,
    preExistingSafeUsdceBalance,
    transactions: compileDepositMaintenanceTransactions({
      protocol,
      safeAddress,
      missingRequirements,
      preExistingSafeUsdceBalance,
    }),
  };
}

function compileDepositMaintenanceTransactions({
  protocol = POLYMARKET_V2_PROTOCOL,
  safeAddress,
  missingRequirements,
  preExistingSafeUsdceBalance,
}: {
  protocol?: PolymarketProtocolDefinition;
  safeAddress: string;
  missingRequirements: V2AllowanceRequirement[];
  preExistingSafeUsdceBalance: bigint;
}): SafeTransaction[] {
  return compileAllowanceMaintenanceTransactions({
    protocol,
    safeAddress,
    missingRequirements,
    usdceBalance: preExistingSafeUsdceBalance,
  });
}

export async function buildDepositMaintenanceTransaction({
  signer,
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
  preExistingSafeUsdceBalance,
}: {
  signer: Signer;
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
  preExistingSafeUsdceBalance?: bigint;
}) {
  const plan = await planDepositMaintenance({
    safeAddress,
    protocol,
    preExistingSafeUsdceBalance,
  });

  return buildSignedSafeExecutionIfNeeded({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.contractInteraction,
  });
}
