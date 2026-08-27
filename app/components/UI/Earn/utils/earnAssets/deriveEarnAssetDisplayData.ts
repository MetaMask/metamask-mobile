import type { EarnAssetMetadata } from '../../types/earnAssets';
import {
  getEarnAssetFiatDisplay,
  getEarnAssetMetadata,
  hasEarnAssetSubsidizedFee,
} from '.';
import { isEarnAssetBalanceBelowMinDepositAmount } from './earnAssetBalance';
import { getEarnAssetRateCopy } from '../earnSection/getEarnAssetRateCopy';
import type { EarnSectionRankedAsset } from '../earnSection';

export interface EarnAssetDisplayData {
  metadata: EarnAssetMetadata;
  fiatBalance?: string;
  hasMinDepositAmount: boolean;
  hasSubsidizedFee: boolean;
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
): EarnAssetDisplayData => ({
  metadata: getEarnAssetMetadata(asset),
  fiatBalance: getEarnAssetFiatDisplay(asset),
  hasMinDepositAmount: !isEarnAssetBalanceBelowMinDepositAmount(asset),
  hasSubsidizedFee: hasEarnAssetSubsidizedFee(asset),
  rateCopy: getEarnAssetRateCopy({ asset }),
});
