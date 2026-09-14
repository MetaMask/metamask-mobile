import type { EarnAsset } from '../../types/earnAssets';

/**
 * Checks whether any experience waives fees for an Earn asset.
 *
 * @param asset - Earn asset whose experiences should be checked.
 * @returns True when at least one experience has a subsidized fee.
 */
export const hasEarnAssetSubsidizedFee = (asset: EarnAsset): boolean =>
  asset.experiences.some(({ isFeeSubsidized }) => isFeeSubsidized);
