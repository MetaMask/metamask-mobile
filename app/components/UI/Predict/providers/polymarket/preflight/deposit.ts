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
  const missingRequirements = await inspectMissingRequirements({
    address: safeAddress,
    requirements: getCanonicalV2AllowanceRequirements(protocol),
  });
  const preExistingSafeUsdceBalance = await getRawTokenBalance({
    address: safeAddress,
    tokenAddress: protocol.collateral.legacyUsdceToken,
  });

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
  const transactions = compileRequirementTransactions(missingRequirements);

  if (
    preExistingSafeUsdceBalance > 0n &&
    protocol.collateral.onrampAddress !== undefined
  ) {
    transactions.push({
      to: protocol.collateral.onrampAddress,
      data: encodeWrap({
        asset: protocol.collateral.legacyUsdceToken,
        to: safeAddress,
        amount: preExistingSafeUsdceBalance,
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  return transactions;
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

  if (plan.transactions.length === 0) {
    return undefined;
  }

  return buildSignedSafeExecution({
    signer,
    safeAddress,
    transactions: plan.transactions,
    type: TransactionType.contractInteraction,
  });
}
