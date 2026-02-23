import {
  PredictFeeCollection,
  PredictHotTabFlag,
  PredictLiveSportsFlag,
  PredictMarketHighlightsFlag,
} from '../types/flags';

export const DEFAULT_FEE_COLLECTION_FLAG = {
  enabled: true,
  collector:
    process.env.METAMASK_ENVIRONMENT === 'dev'
      ? '0xe6a2026d58eaff3c7ad7ba9386fb143388002382'
      : '0x100c7b833bbd604a77890783439bbb9d65e31de7',
  metamaskFee: 0.02, // 2%
  providerFee: 0.02, // 2%
  waiveList: [],
} satisfies PredictFeeCollection;

export const DEFAULT_LIVE_SPORTS_FLAG: PredictLiveSportsFlag = {
  enabled: false,
  leagues: [],
};

export const DEFAULT_MARKET_HIGHLIGHTS_FLAG: PredictMarketHighlightsFlag = {
  enabled: false,
  highlights: [],
  minimumVersion: '7.64.0',
};

export const DEFAULT_HOT_TAB_FLAG: PredictHotTabFlag = {
  enabled: false,
  queryParams:
    'active=true&archived=false&closed=false&liquidity_min=10000&volume_min=10000&tag_id=1',
  minimumVersion: '7.64.0',
};
