import { isStrictHexString, type Hex } from '@metamask/utils';
import { isAddress } from 'ethers/lib/utils';
import type { RootState } from '../../../../reducers';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { isPremiumDepositCandidateStatus } from '../../../../util/subscription/moneyAccountPlusStatus';
import { prefixError } from '../../../../util/transactions/error-prefix';
import { getVaultWhitelistSignature } from '../../../../util/transactions/sentinel-api';
import type { MoneyAccountPremiumDepositAuthorization } from './moneyAccountTransactions';

/**
 * Pre-filters deposits before consulting Sentinel for authoritative eligibility.
 *
 * @param state - Current Redux state.
 * @param chainId - Deposit chain.
 * @returns Whether the premium route is a candidate for this deposit.
 */
export function isPremiumDepositCandidate(
  state: RootState,
  chainId: Hex,
): boolean {
  return (
    selectMoneyAccountPremiumVaultConfig(state)?.chainId === chainId &&
    isPremiumDepositCandidateStatus(
      selectMoneyAccountPlusSubscription(state)?.status,
    )
  );
}

/**
 * Requests authorization for the exact amount received by the Money Account.
 * Throws on service failures so the second leg can defer to CHOMP.
 *
 * @param chainId - Deposit chain.
 * @param address - Money Account sending and receiving the deposit.
 * @param amount - Settled raw mUSD amount.
 * @returns Premium authorization, or undefined for an ineligible account.
 */
export async function resolveMoneyAccountDepositVault(
  chainId: Hex,
  address: string | undefined,
  amount: string,
): Promise<MoneyAccountPremiumDepositAuthorization | undefined> {
  try {
    if (!isStrictHexString(address) || !isAddress(address)) {
      throw new Error('Invalid Money Account address');
    }
    const result = await getVaultWhitelistSignature(chainId, address, amount);
    if (result.eligible) {
      return {
        recipient: address,
        deadline: result.deadline,
        signature: result.signature,
      };
    }
    return undefined;
  } catch (error) {
    throw prefixError(error, 'Premium Deposit: ');
  }
}
