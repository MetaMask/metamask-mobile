import { Infer } from '@metamask/superstruct';
import { PredictFeeCollectionSchema } from '../schemas';
import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

export type PredictFeeCollection = Infer<typeof PredictFeeCollectionSchema>;

export interface PredictLiveSportsFlag {
  enabled: boolean;
  leagues: string[];
}

export interface PredictMarketHighlight {
  category: string;
  markets: string[];
}

export interface PredictMarketHighlightsFlag extends VersionGatedFeatureFlag {
  highlights: PredictMarketHighlight[];
}

export interface PredictExtendedSportsMarketsFlag
  extends VersionGatedFeatureFlag {
  leagues: string[];
}

export interface PredictFeatureFlags {
  feeCollection: PredictFeeCollection;
  liveSportsLeagues: string[];
  extendedSportsMarketsLeagues: string[];
  marketHighlightsFlag: PredictMarketHighlightsFlag;
  fakOrdersEnabled: boolean;
  predictWithAnyTokenEnabled: boolean;
  predictUpDownEnabled: boolean;
}

export interface PredictHotTabFlag extends VersionGatedFeatureFlag {
  queryParams?: string; // Raw query params WITHOUT leading &: "tag_id=149&tag_id=100995&order=volume24hr"
}
