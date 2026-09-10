import type { Hex } from '@metamask/utils';
import type { EarnAsset } from '../../types/earnAssets';
import { requireTrackedEarnAsset } from './requireTrackedEarnAsset';

/**
 * Builds the payment token required to start a Money deposit.
 *
 * @param earnAsset - Earn asset selected for the Money strategy.
 * @returns Payment token address and chain ID.
 * @throws When the selected asset is not tracked or has no address.
 */
export const getMoneyDepositPaymentToken = (
  earnAsset: EarnAsset,
): { address: Hex; chainId: Hex } => {
  const asset = requireTrackedEarnAsset(earnAsset, 'Money deposit');

  if (!('address' in asset)) {
    throw new Error('Money deposit requires tracked asset with address');
  }

  return {
    address: asset.address as Hex,
    chainId: asset.chainId as Hex,
  };
};
