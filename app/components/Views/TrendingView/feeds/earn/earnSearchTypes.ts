import type {
  EarnAssetId,
  EarnRateStatus,
} from '../../../../UI/Earn/types/earnAssets';
import type { EarnSectionRankedAsset } from '../../../../UI/Earn/utils/earnSection';

export interface EarnMoneyAccountSearchItem {
  kind: 'money-account';
  id: 'money-account';
  balanceRaw?: string;
  balanceFiat?: string;
  isBalanceLoading: boolean;
  apyPercent?: number;
  rateStatus: EarnRateStatus;
}

export interface EarnAssetSearchItem {
  kind: 'asset';
  id: EarnAssetId;
  asset: EarnSectionRankedAsset;
}

export type EarnSearchItem = EarnMoneyAccountSearchItem | EarnAssetSearchItem;

export interface EarnSearchFeedError {
  message: string;
  retry: () => Promise<void>;
  isRetrying: boolean;
}

export interface EarnSearchFeedResult {
  data: EarnSearchItem[];
  isLoading: boolean;
  error?: EarnSearchFeedError;
}
