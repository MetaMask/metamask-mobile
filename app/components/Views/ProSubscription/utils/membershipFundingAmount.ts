import type { Hex } from '@metamask/utils';
import { getVaultRate } from '../../../UI/Money/utils/moneyAccountTransactions';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';

const ONE_SHARE = BigInt(1_000_000);

/**
 * Extra mUSD base units on top of the exact minimum, so a rate tick between
 * the quote and the vault deposits cannot leave the settled value 1 unit short.
 */
export const MEMBERSHIP_FUNDING_SAFETY_UNITS = BigInt(2);

export interface MembershipFundingRates {
  baseRate: bigint;
  /** Undefined when the premium vault is not configured; only the base deposit is covered. */
  premiumRate?: bigint;
}

interface VaultRateSource {
  chainId: string;
  accountantAddress: string;
}

/**
 * Mirrors `TellerWithYieldStreaming` deposit minting, which divides by
 * `rate + 1` and rounds down against the depositor.
 *
 * @param amount - mUSD deposited, in base units.
 * @param rate - Accountant rate (6 decimals).
 * @returns Shares minted.
 */
export function previewDepositShares(amount: bigint, rate: bigint): bigint {
  return (amount * ONE_SHARE) / (rate + BigInt(1));
}

/**
 * Mirrors withdraw and balance valuation: `floor(shares * rate / ONE_SHARE)`.
 *
 * @param shares - Vault shares.
 * @param rate - Accountant rate (6 decimals).
 * @returns mUSD value in base units.
 */
export function previewRedeemAssets(shares: bigint, rate: bigint): bigint {
  return (shares * rate) / ONE_SHARE;
}

/**
 * Value that `musd` is worth after the base vault deposit and, when a premium
 * rate is given, the base → premium migration (withdraw to mUSD, then deposit
 * into premium).
 *
 * @param musd - mUSD funded, in base units.
 * @param rates - Current base and premium accountant rates.
 * @returns Settled value in mUSD base units.
 */
export function previewSettledValue(
  musd: bigint,
  { baseRate, premiumRate }: MembershipFundingRates,
): bigint {
  const baseShares = previewDepositShares(musd, baseRate);
  const baseValue = previewRedeemAssets(baseShares, baseRate);
  if (premiumRate === undefined) {
    return baseValue;
  }
  const premiumShares = previewDepositShares(baseValue, premiumRate);
  return previewRedeemAssets(premiumShares, premiumRate);
}

/**
 * Smallest mUSD funding whose settled vault value is at least `target`, plus
 * {@link MEMBERSHIP_FUNDING_SAFETY_UNITS}. Funding exactly `target` always
 * settles a few units short because every vault deposit rounds down.
 *
 * @param target - Required value in mUSD base units.
 * @param rates - Current base and premium accountant rates.
 * @returns mUSD to fund, in base units.
 */
export function getMembershipFundingAmount(
  target: bigint,
  rates: MembershipFundingRates,
): bigint {
  if (target <= BigInt(0)) {
    return BigInt(0);
  }

  let low = target;
  let high = target + (target * BigInt(4)) / ONE_SHARE + BigInt(8);
  while (previewSettledValue(high, rates) < target) {
    high += high - target;
  }

  while (low < high) {
    const mid = (low + high) / BigInt(2);
    if (previewSettledValue(mid, rates) >= target) {
      high = mid;
    } else {
      low = mid + BigInt(1);
    }
  }

  return low + MEMBERSHIP_FUNDING_SAFETY_UNITS;
}

/**
 * Reads the base and (when configured) premium accountant rates.
 *
 * @param baseVault - Base vault config.
 * @param premiumVault - Premium vault config, if the flag is set.
 * @returns Current rates for {@link getMembershipFundingAmount}.
 */
export async function fetchMembershipFundingRates(
  baseVault: VaultRateSource,
  premiumVault: VaultRateSource | undefined,
): Promise<MembershipFundingRates> {
  const readRate = (vault: VaultRateSource) => {
    const provider = getProviderByChainId(vault.chainId as Hex);
    if (!provider) {
      throw new Error(`No provider available for chain ${vault.chainId}`);
    }
    return getVaultRate({
      accountantAddress: vault.accountantAddress,
      provider,
    });
  };

  const [baseRate, premiumRate] = await Promise.all([
    readRate(baseVault),
    premiumVault ? readRate(premiumVault) : Promise.resolve(undefined),
  ]);

  return { baseRate, premiumRate };
}
