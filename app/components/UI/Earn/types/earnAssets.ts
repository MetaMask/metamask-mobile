import type { Asset } from '@metamask/assets-controllers';
import type { LendingMarket } from '@metamask/stake-sdk';
import type { CaipAssetType } from '@metamask/utils';
import type { EARN_EXPERIENCES } from '../constants/experiences';

export type EarnAssetId = CaipAssetType;

export type EarnRateStatus = 'loading' | 'ready' | 'error' | 'unavailable';

interface EarnRateBase {
  type: 'APR' | 'APY';
}

export type EarnRate =
  | (EarnRateBase & {
      status: 'ready';
      percentage: number;
    })
  | (EarnRateBase & {
      status: Exclude<EarnRateStatus, 'ready'>;
    });

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

/**
 * Metadata for an Earn opportunity that is not present in the selected
 * account's AssetsController state.
 */
export interface EarnAssetMetadata {
  address: string;
  chainId: string;
  decimals: number;
  image: string;
  name: string;
  symbol: string;
  ticker?: string;
  logo: string | undefined;
  isNative?: boolean;
  isETH: boolean | undefined;
  isStaked?: boolean;
}

interface EarnAssetBase {
  assetId: EarnAssetId;
  experiences: readonly EarnExperience[];
}

export interface HeldEarnAsset extends EarnAssetBase {
  kind: 'held';
  asset: Asset;
}

export interface DiscoveryEarnAsset extends EarnAssetBase {
  kind: 'discovery';
  metadata: EarnAssetMetadata;
}

export type EarnAsset = HeldEarnAsset | DiscoveryEarnAsset;
