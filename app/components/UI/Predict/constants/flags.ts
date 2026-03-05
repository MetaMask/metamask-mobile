import {
  PredictHotTabFlag,
  PredictLiveSportsFlag,
  PredictMarketHighlightsFlag,
} from '../types/flags';

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
