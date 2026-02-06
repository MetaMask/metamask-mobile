import type { Hex } from '@metamask/utils';
import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

export interface PredictFeeCollection {
  enabled: boolean;
  collector: Hex;
  metamaskFee: number;
  providerFee: number;
  waiveList: string[];
}

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

export interface PredictHotTabFlag extends VersionGatedFeatureFlag {
  queryParams?: string; // Raw query params WITHOUT leading &: "tag_id=149&tag_id=100995&order=volume24hr"
}
