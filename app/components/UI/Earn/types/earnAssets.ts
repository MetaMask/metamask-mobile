import type { LendingMarket } from '@metamask/stake-sdk';
import type { CaipAssetType } from '@metamask/utils';
import type { AssetType } from '../../../Views/confirmations/types/token';
import type { EARN_EXPERIENCES } from '../constants/experiences';

export type EarnAssetId = CaipAssetType;

export type EarnRateStatus = 'loading' | 'ready' | 'error' | 'unavailable';

export interface EarnRate {
  type: 'APR' | 'APY';
  percentage?: number;
  status: EarnRateStatus;
}

export type EarnExperienceType = EARN_EXPERIENCES | 'MONEY_ACCOUNT_DEPOSIT';

export type EarnAssetRole = 'funding' | 'underlying' | 'output';

export interface EarnExperience {
  id: string;
  type: EarnExperienceType;
  role: EarnAssetRole;
  rate: EarnRate;
  isFeeSubsidized: boolean;
  market?: LendingMarket;
}

export interface EarnAsset
  extends Omit<AssetType, 'assetId' | 'experience' | 'experiences'> {
  assetId: EarnAssetId;
  experiences: readonly EarnExperience[];
  balanceFormatted?: string;
  balanceMinimalUnit?: string;
  balanceFiatNumber?: number;
  isBalanceFiatAvailable?: boolean;
  tokenUsdExchangeRate?: number;
}
