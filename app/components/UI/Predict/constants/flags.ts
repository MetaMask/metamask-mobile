import type {
  PredictExtendedSportsMarketsFlag,
  PredictFeedBannerConfig,
  PredictFeedCarouselConfig,
  PredictFeeCollection,
  PredictHotTabFlag,
  PredictLiveSportsFlag,
  PredictMarketHighlightsFlag,
  PredictSportsFeedChipConfig,
  PredictSportsFeedConfig,
  PredictSportsFeedTabConfig,
  PredictWimbledonTabFlag,
  PredictWorldCupConfig,
} from '../types/flags';
import { PREDICT_MIN_GAME_OUTCOME_VOLUME } from '../utils/marketStaleness';
import {
  PredictFeedBannerPosition,
  PredictFeedBannerSeverity,
} from './feedBanner';

export const DEFAULT_PREDICT_FEED_CAROUSEL_FLAG: PredictFeedCarouselConfig = {
  enabled: false,
  minimumVersion: '',
  mode: 'live',
  contentSource: {
    composition: 'query-results',
    queryParams: '',
    excludedMarketIds: [],
  },
};

export const DEFAULT_PREDICT_FEED_BANNER_FLAG: PredictFeedBannerConfig = {
  enabled: false,
  minimumVersion: '',
  id: '',
  title: '',
  description: '',
  position: PredictFeedBannerPosition.AfterWorldCupBanner,
  severity: PredictFeedBannerSeverity.Info,
  dismissible: false,
};

export const PREDICT_MARKET_LIST_ORDERS = [
  'volume24hr',
  'volume',
  'liquidity',
  'ending_soon',
  'newest',
  'upcoming',
  'start_time',
] as const;

export type PredictMarketListOrder =
  (typeof PREDICT_MARKET_LIST_ORDERS)[number];

export const DEFAULT_FEE_COLLECTION_FLAG = {
  enabled: true,
  collector:
    process.env.METAMASK_ENVIRONMENT === 'dev'
      ? '0xe6a2026d58eaff3c7ad7ba9386fb143388002382'
      : '0x100c7b833bbd604a77890783439bbb9d65e31de7',
  metamaskFee: 0.02, // 2%
  providerFee: 0.02, // 2%
  waiveList: [],
  executors: [],
  permit2Enabled: false,
} satisfies PredictFeeCollection;

export const DEFAULT_LIVE_SPORTS_FLAG: PredictLiveSportsFlag = {
  enabled: false,
  leagues: [],
};

export const DEFAULT_EXTENDED_SPORTS_MARKETS_FLAG: PredictExtendedSportsMarketsFlag =
  {
    enabled: false,
    minimumVersion: '',
    leagues: [],
    enabledSportsMarketTypes: [],
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

export const PREDICT_POLYMARKET_GAMES_TAG_ID = '100639';
export const PREDICT_WIMBLEDON_DEFAULT_TAG_SLUG = 'tennis';
export const PREDICT_WIMBLEDON_DEFAULT_SEARCH = 'Wimbledon';

export const PREDICT_WIMBLEDON_DEFAULT_QUERY_PARAMS =
  `active=true&archived=false&closed=false&ended=false&tag_id=${PREDICT_POLYMARKET_GAMES_TAG_ID}` +
  `&tag_slug=${PREDICT_WIMBLEDON_DEFAULT_TAG_SLUG}` +
  `&title_search=${PREDICT_WIMBLEDON_DEFAULT_SEARCH}` +
  '&order=volume24hr&ascending=false';

export const DEFAULT_WIMBLEDON_TAB_FLAG = {
  enabled: false,
  queryParams: PREDICT_WIMBLEDON_DEFAULT_QUERY_PARAMS,
  minimumVersion: '',
} satisfies PredictWimbledonTabFlag;

export const PREDICT_WORLD_CUP_DEFAULT_TAG_SLUG = 'fifa-world-cup';

export const DEFAULT_PREDICT_WORLD_CUP_FLAG: PredictWorldCupConfig = {
  enabled: false,
  minimumVersion: '',
  showMainFeedBanner: false,
  showMainFeedTab: false,
  showWorldCupScreen: false,
  showHubV2: false,
  showHubBanner: false,
  tagSlug: PREDICT_WORLD_CUP_DEFAULT_TAG_SLUG,
  gamesTagId: PREDICT_POLYMARKET_GAMES_TAG_ID,
  winnerEventId: '',
  stages: [],
};

const createSportsFeedChip = (
  id: string,
  tagSlug: string,
): PredictSportsFeedChipConfig => ({
  id,
  kind: 'tag',
  tagSlug,
  titleKey: `predict.feed.filters.${id}`,
});

const createSportsFeedChips = (
  ...tagSlugs: string[]
): PredictSportsFeedChipConfig[] =>
  tagSlugs.map((tagSlug) => createSportsFeedChip(tagSlug, tagSlug));

const createSportsFeedTab = ({
  id,
  chips,
  titleKey = `predict.feed.tabs.${id}`,
  tagSlug = id,
  gamesTitleKey = 'predict.feed.filters.games',
  gamesFilterByVolume,
}: {
  id: string;
  chips: PredictSportsFeedChipConfig[];
  titleKey?: string;
  tagSlug?: string;
  gamesTitleKey?: string;
  gamesFilterByVolume?: number;
}): PredictSportsFeedTabConfig => ({
  id,
  titleKey,
  tagSlug,
  defaultFilterId: 'games',
  chips: [
    {
      id: 'games',
      kind: 'games',
      titleKey: gamesTitleKey,
      filterByVolume: gamesFilterByVolume,
    },
    {
      id: 'props',
      kind: 'props',
      titleKey: 'predict.feed.filters.props',
    },
    ...chips,
  ],
});

export const DEFAULT_PREDICT_SPORTS_FEED_FLAG: PredictSportsFeedConfig = {
  enabled: true,
  minimumVersion: '',
  tabs: [
    createSportsFeedTab({
      id: 'all',
      titleKey: 'predict.feed.tabs.all',
      tagSlug: 'sports',
      chips: [],
      gamesFilterByVolume: PREDICT_MIN_GAME_OUTCOME_VOLUME,
    }),
    createSportsFeedTab({
      id: 'soccer',
      chips: createSportsFeedChips(
        'mls',
        'champions-league',
        'EPL',
        'uel',
        'la-liga',
        'serie-a',
        'bundesliga',
        'ligue-1',
        'lib',
      ),
    }),
    createSportsFeedTab({
      id: 'baseball',
      chips: createSportsFeedChips('mlb', 'kbo', 'npb', 'cpbl', 'awards'),
    }),
    createSportsFeedTab({
      id: 'football',
      chips: createSportsFeedChips(
        'nfl',
        'nfl-team-futures',
        'nfl-free-agency',
        'cfb',
        'cfl',
      ),
    }),
    createSportsFeedTab({
      id: 'basketball',
      chips: createSportsFeedChips('nba', 'nba-free-agency', 'wnba', 'ncaa'),
    }),
    createSportsFeedTab({
      id: 'esports',
      chips: createSportsFeedChips(
        'league-of-legends',
        'counter-strike-2',
        'valorant',
        'dota-2',
        'rainbow-six-siege',
      ),
    }),
    createSportsFeedTab({
      id: 'tennis',
      chips: createSportsFeedChips('atp', 'wta', 'itf'),
    }),
    createSportsFeedTab({
      id: 'cricket',
      chips: createSportsFeedChips('international-cricket', 't20-blast'),
    }),
    createSportsFeedTab({
      id: 'golf',
      gamesTitleKey: 'predict.feed.filters.tournaments',
      chips: createSportsFeedChips('pga-tour', 'liv-golf'),
    }),
    createSportsFeedTab({
      id: 'combat',
      gamesTitleKey: 'predict.feed.filters.fights',
      chips: createSportsFeedChips('ufc', 'boxing'),
    }),
    createSportsFeedTab({
      id: 'hockey',
      chips: createSportsFeedChips('nhl'),
    }),
  ],
};
