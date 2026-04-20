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

export interface DepositMaintenancePlan {
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
  preExistingSafeUsdceBalance: bigint;
  transactions: SafeTransaction[];
}

export async function planDepositMaintenance({
  safeAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
}): Promise<DepositMaintenancePlan> {
  const [missingRequirements, preExistingSafeUsdceBalance] = await Promise.all([
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
    preExistingSafeUsdceBalance,
    transactions: compileDepositMaintenanceTransactions({
      protocol,
      safeAddress,
      missingRequirements,
      preExistingSafeUsdceBalance,
    }),
  };
}

export function compileDepositMaintenanceTransactions({
  protocol = POLYMARKET_V2_PROTOCOL,
  safeAddress,
  missingRequirements,
  preExistingSafeUsdceBalance,
}: {
  protocol?: PolymarketProtocolDefinition;
  safeAddress: string;
  missingRequirements: ReturnType<typeof getCanonicalV2AllowanceRequirements>;
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
}: {
  signer: Signer;
  safeAddress: string;
  protocol?: PolymarketProtocolDefinition;
}) {
  const plan = await planDepositMaintenance({ safeAddress, protocol });

  return buildSignedSafeExecutionIfNeeded({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.contractInteraction,
  });
}
