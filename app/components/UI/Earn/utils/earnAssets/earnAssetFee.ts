import type { EarnAsset } from '../../types/earnAssets';

export const hasEarnAssetSubsidizedFee = (asset: EarnAsset): boolean =>
  asset.experiences.some(({ isFeeSubsidized }) => isFeeSubsidized);
