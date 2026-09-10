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

export type EarnExperienceUnavailableReason =
  | 'output_asset'
  // The asset is not tracked by the selected account wallet.
  | 'asset_not_tracked'
  // The asset is tracked, but its balance or fiat valuation is unavailable.
  | 'balance_unavailable'
  // The balance is known, but is below the minimum required deposit amount.
  | 'insufficient_balance';

export type EarnExperienceAvailability =
  | {
      status: 'available';
    }
  | {
      status: 'unavailable';
      reason: EarnExperienceUnavailableReason;
    };

export interface EarnExperience {
  id: string;
  type: EarnExperienceType;
  role: EarnAssetRole;
  availability: EarnExperienceAvailability;
  rate: EarnRate;
  isFeeSubsidized: boolean;
  market?: LendingMarket;
}

/** Normalized metadata for an Earn opportunity. */
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

export type EarnAssetWalletState =
  | {
      readonly status: 'tracked';
      readonly asset: Asset;
    }
  | {
      readonly status: 'untracked';
    };

export interface EarnAsset {
  readonly assetId: EarnAssetId;
  readonly metadata: EarnAssetMetadata;
  readonly wallet: EarnAssetWalletState;
  readonly experiences: readonly EarnExperience[];
}
