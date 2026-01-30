import type { Hex } from '@metamask/utils';

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

export interface PredictMarketHighlightsFlag {
  enabled: boolean;
  highlights: PredictMarketHighlight[];
}

export interface PredictHotTabFlag {
  enabled: boolean;
  queryParams?: string; // Raw query params: "&tag_id=149&tag_id=100995&order=volume24hr"
}
