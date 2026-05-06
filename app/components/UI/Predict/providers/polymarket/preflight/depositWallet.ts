import {
  POLYMARKET_V2_PROTOCOL,
  type PolymarketProtocolDefinition,
} from '../protocol/definitions';
import { PERMIT2_ADDRESS } from '../safe/constants';
import type { SafeTransaction } from '../safe/types';
import { compileRequirementTransactions } from './compileRequirementTransactions';
import { inspectMissingRequirements } from './inspectMissingRequirements';
import {
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
  return getActiveV2AllowanceRequirements(protocol).filter((requirement) => {
    if (requirement.type !== 'erc20-allowance') {
      return true;
    }

    // Polymarket's deposit-wallet relayer allow-list blocks Permit2 approvals
    // (`approve spender 0x000000000022D473030F116dDEE9F6B43aC78BA3 is not in the allowed list`).
    // Skip this for deposit-wallet setup for now; fees will move to a different
    // on-chain collection flow instead of relying on Permit2 here.
    return requirement.spender.toLowerCase() !== PERMIT2_ADDRESS.toLowerCase();
  });
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
