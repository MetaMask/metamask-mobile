import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketTradeProtocol,
} from '../protocol/definitions';
import type { SafeTransaction } from '../safe/types';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import { getPositionsAllowanceRequirements } from './positionsAllowanceRequirements';
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
  protocol: PolymarketTradeProtocol,
): V2AllowanceRequirement[] {
  return filterDepositWalletUnsupportedRequirements(
    protocol.key === 'positions'
      ? getPositionsAllowanceRequirements(protocol)
      : getActiveV2AllowanceRequirements(protocol),
  );
}

/**
 * Plans the deposit-wallet allowance repairs for `protocol`. Order flows pass
 * the protocol the order routes to (by Gamma market version); every other
 * flow uses the CTF default.
 */
export async function planDepositWalletPreflight({
  walletAddress,
  protocol = POLYMARKET_V2_PROTOCOL,
}: {
  walletAddress: string;
  protocol?: PolymarketTradeProtocol;
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
