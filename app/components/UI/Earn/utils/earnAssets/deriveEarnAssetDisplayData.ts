import type { EarnAssetMetadata } from '../../types/earnAssets';
import {
  getEarnAssetFiatDisplay,
  getEarnAssetMetadata,
  hasEarnAssetSubsidizedFee,
} from '.';
import { isEarnAssetBalanceBelowMinDepositAmount } from './earnAssetBalance';
import { getEarnAssetRateCopy } from '../earnSection/getEarnAssetRateCopy';
import type { EarnSectionRankedAsset } from '../earnSection';

/** Derived display values shared by Earn asset cards and search rows. */
export interface EarnAssetDisplayData {
  /** Normalized name, symbol, ticker, and token metadata. */
  metadata: EarnAssetMetadata;
  /** Localized fiat balance for held assets, when available. */
  fiatBalance?: string;
  /** Whether the asset meets the minimum deposit amount. */
  hasMinDepositAmount: boolean;
  /** Whether any available Earn experience waives fees. */
  hasSubsidizedFee: boolean;
  /** Localized APY/APR or unavailable-rate copy. */
  rateCopy: string;
}

/**
 * Centralizes display data derivation for Earn assets.
 *
 * @param asset - Ranked Earn asset to derive display data for.
 * @returns Display metadata, fiat balance, minimum deposit amount, subsidized fee state, and rate copy.
 */
export const deriveEarnAssetDisplayData = (
  asset: EarnSectionRankedAsset,
): EarnAssetDisplayData => {
  const fiatBalance = getEarnAssetFiatDisplay(asset);

  return {
    metadata: getEarnAssetMetadata(asset),
    fiatBalance,
    hasMinDepositAmount:
      fiatBalance !== undefined &&
      !isEarnAssetBalanceBelowMinDepositAmount(asset),
    hasSubsidizedFee: hasEarnAssetSubsidizedFee(asset),
    rateCopy: getEarnAssetRateCopy({ asset }),
  };
};
