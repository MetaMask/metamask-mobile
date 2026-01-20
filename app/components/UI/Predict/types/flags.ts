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
