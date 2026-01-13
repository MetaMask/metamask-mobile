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
