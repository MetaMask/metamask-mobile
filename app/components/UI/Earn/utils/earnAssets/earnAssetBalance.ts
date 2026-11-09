import BigNumber from 'bignumber.js';
import { moneyFormatFiat } from '../../../Money/utils/moneyFormatFiat';
import type { EarnAsset } from '../../types/earnAssets';

export const hasEarnAssetBalance = (earnAsset: EarnAsset) =>
  earnAsset.wallet.status === 'tracked' &&
  new BigNumber(earnAsset.wallet.asset.rawBalance).isGreaterThan(0);

export const getEarnAssetFiatNumber = (asset: EarnAsset) =>
  asset.wallet.status === 'tracked' &&
  Number.isFinite(asset.wallet.asset.fiat?.balance)
    ? asset.wallet.asset.fiat?.balance
    : undefined;

export const getEarnAssetFiatDisplay = (earnAsset: EarnAsset) => {
  if (earnAsset.wallet.status !== 'tracked' || !earnAsset.wallet.asset.fiat) {
    return undefined;
  }

  return moneyFormatFiat(
    new BigNumber(earnAsset.wallet.asset.fiat.balance),
    earnAsset.wallet.asset.fiat.currency,
  );
};

export const MIN_EARN_DEPOSIT_BALANCE = 0.01;
