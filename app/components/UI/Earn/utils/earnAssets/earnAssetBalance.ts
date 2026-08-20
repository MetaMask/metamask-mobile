import BigNumber from 'bignumber.js';
import type { EarnAsset } from '../../types/earnAssets';

export const hasEarnAssetBalance = (asset: EarnAsset) => {
  if (asset.balanceMinimalUnit !== undefined) {
    return new BigNumber(asset.balanceMinimalUnit).isGreaterThan(0);
  }
  if (asset.rawBalance !== undefined) {
    return asset.rawBalance !== '0x0';
  }
  return new BigNumber(asset.balance || 0).isGreaterThan(0);
};

export const getEarnAssetFiatNumber = (asset: EarnAsset) => {
  if (
    asset.isBalanceFiatAvailable !== false &&
    Number.isFinite(asset.balanceFiatNumber)
  ) {
    return asset.balanceFiatNumber;
  }
  return Number.isFinite(asset.fiat?.balance) ? asset.fiat?.balance : undefined;
};

export const getEarnAssetFiatDisplay = (asset: EarnAsset) =>
  asset.isBalanceFiatAvailable !== false
    ? (asset.balanceFiat ?? asset.balanceInSelectedCurrency)
    : asset.balanceInSelectedCurrency;
