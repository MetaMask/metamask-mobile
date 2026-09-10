import type { Asset } from '@metamask/assets-controllers';
import type { EarnAsset } from '../../types/earnAssets';

/**
 * Returns AssetsController data required by wallet-backed operations.
 *
 * @param asset - Earn asset used by the operation.
 * @param operation - Operation name included in the failure message.
 * @returns Wallet-tracked AssetsController asset.
 * @throws When the selected account wallet does not track the asset.
 */
export const requireTrackedEarnAsset = (
  asset: EarnAsset,
  operation: string,
): Asset => {
  if (asset.wallet.status !== 'tracked') {
    throw new Error(
      `${operation} requires wallet-tracked asset: ${asset.assetId}`,
    );
  }

  return asset.wallet.asset;
};
