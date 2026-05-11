import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import type { SafeTransaction } from '../safe/types';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
  filterDepositWalletUnsupportedRequirements,
  getActiveV2AllowanceRequirements,
  type V2AllowanceRequirement,
} from './v2AllowanceRequirements';

export interface DepositWalletPreflightPlan {
  missingRequirements: V2AllowanceRequirement[];
  transactions: SafeTransaction[];
}

function getDepositWalletAllowanceRequirements(
  protocol: PolymarketProtocolDefinition,
): V2AllowanceRequirement[] {
  return filterDepositWalletUnsupportedRequirements(
    getActiveV2AllowanceRequirements(protocol),
  );
}

export async function planDepositWalletPreflight({
  walletAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  walletAddress: string;
  protocol?: PolymarketProtocolDefinition;
}): Promise<DepositWalletPreflightPlan> {
  const requirements = getDepositWalletAllowanceRequirements(protocol);
  const missingRequirements = await inspectMissingRequirements({
    address: walletAddress,
    requirements,
  });

  return {
    missingRequirements,
    transactions: compileRequirementTransactions(missingRequirements),
  };
}
