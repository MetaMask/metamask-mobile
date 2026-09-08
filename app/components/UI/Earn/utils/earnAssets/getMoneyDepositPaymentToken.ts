import type { Hex } from '@metamask/utils';
import type { EarnAsset } from '../../types/earnAssets';

/**
 * Builds the payment token required to start a Money deposit.
 *
 * @param earnAsset - Earn asset selected for the Money strategy.
 * @returns Payment token address and chain ID.
 * @throws When the selected asset is not a held asset with an address.
 */
export const getMoneyDepositPaymentToken = (
  earnAsset: EarnAsset,
): { address: Hex; chainId: Hex } => {
  if (earnAsset.kind !== 'held' || !('address' in earnAsset.asset)) {
    throw new Error(
      'Money deposit requires a held asset with address property',
    );
  }

  return {
    address: earnAsset.asset.address as Hex,
    chainId: earnAsset.asset.chainId as Hex,
  };
};
