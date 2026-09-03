import BigNumber from 'bignumber.js';
import { moneyFormatFiat } from '../../../Money/utils/moneyFormatFiat';
import type { EarnAsset } from '../../types/earnAssets';

export const hasEarnAssetBalance = (earnAsset: EarnAsset) =>
  earnAsset.kind === 'held' &&
  new BigNumber(earnAsset.asset.rawBalance).isGreaterThan(0);

export const getEarnAssetFiatNumber = (asset: EarnAsset) =>
  asset.kind === 'held' && Number.isFinite(asset.asset.fiat?.balance)
    ? asset.asset.fiat?.balance
    : undefined;

export const getEarnAssetFiatDisplay = (earnAsset: EarnAsset) => {
  if (earnAsset.kind !== 'held' || !earnAsset.asset.fiat) {
    return undefined;
  }

  return moneyFormatFiat(
    new BigNumber(earnAsset.asset.fiat.balance),
    earnAsset.asset.fiat.currency,
  );
};

const MIN_DEPOSIT_BALANCE = 0.01;

export const isEarnAssetBalanceBelowMinDepositAmount = (
  earnAsset: EarnAsset,
) => {
  if (earnAsset.kind !== 'held') {
    return true;
  }

  return new BigNumber(earnAsset.asset.fiat?.balance ?? 0).isLessThan(
    MIN_DEPOSIT_BALANCE,
  );
};
