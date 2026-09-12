import type { Asset } from '@metamask/assets-controllers';
import type { EarnAsset } from '../../types/earnAssets';

/**
 * Returns the AssetsController asset tracked by the selected wallet.
 *
 * @param earnAsset - Earn asset used by the operation.
 * @param operation - Operation name included in the failure message.
 * @returns Wallet-tracked AssetsController asset.
 * @throws When the selected account wallet does not track the asset.
 */
export const requireTrackedWalletAsset = (
  earnAsset: EarnAsset,
  operation: string,
): Asset => {
  if (earnAsset.wallet.status !== 'tracked') {
    throw new Error(
      `${operation} requires wallet-tracked asset: ${earnAsset.assetId}`,
    );
  }

  return earnAsset.wallet.asset;
};
