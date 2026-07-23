import {
  PredictExtendedSportsMarketsFlag,
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

const createSportsFeedTab = ({
  id,
  chips,
  titleKey = `predict.feed.tabs.${id}`,
  tagSlug = id,
}: {
  id: string;
  chips: PredictSportsFeedChipConfig[];
  titleKey?: string;
  tagSlug?: string;
}): PredictSportsFeedTabConfig => ({
  id,
  titleKey,
  tagSlug,
  defaultFilterId: 'games',
  chips: [
    {
      id: 'games',
      kind: 'games',
      titleKey: 'predict.feed.filters.games',
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
    }),
    createSportsFeedTab({
      id: 'soccer',
      chips: [
        createSportsFeedChip('mls', 'mls'),
        createSportsFeedChip('champions-league', 'champions-league'),
        createSportsFeedChip('EPL', 'EPL'),
        createSportsFeedChip('uel', 'uel'),
        createSportsFeedChip('la-liga', 'la-liga'),
        createSportsFeedChip('serie-a', 'serie-a'),
        createSportsFeedChip('bundesliga', 'bundesliga'),
        createSportsFeedChip('ligue-1', 'ligue-1'),
        createSportsFeedChip('lib', 'lib'),
      ],
    }),
    createSportsFeedTab({
      id: 'baseball',
      chips: [
        createSportsFeedChip('mlb', 'mlb'),
        createSportsFeedChip('kbo', 'kbo'),
        createSportsFeedChip('npb', 'npb'),
        createSportsFeedChip('cpbl', 'cpbl'),
        createSportsFeedChip('awards', 'awards'),
      ],
    }),
    createSportsFeedTab({
      id: 'football',
      chips: [
        createSportsFeedChip('nfl', 'nfl'),
        createSportsFeedChip('nfl-team-futures', 'nfl-team-futures'),
        createSportsFeedChip('nfl-free-agency', 'nfl-free-agency'),
        createSportsFeedChip('cfb', 'cfb'),
        createSportsFeedChip('cfl', 'cfl'),
      ],
    }),
    createSportsFeedTab({
      id: 'basketball',
      chips: [
        createSportsFeedChip('nba', 'nba'),
        createSportsFeedChip('nba-free-agency', 'nba-free-agency'),
        createSportsFeedChip('wnba', 'wnba'),
        createSportsFeedChip('ncaa', 'ncaa'),
      ],
    }),
    createSportsFeedTab({
      id: 'esports',
      chips: [
        createSportsFeedChip('league-of-legends', 'league-of-legends'),
        createSportsFeedChip('counter-strike-2', 'counter-strike-2'),
        createSportsFeedChip('valorant', 'valorant'),
        createSportsFeedChip('dota-2', 'dota-2'),
        createSportsFeedChip('rainbow-six-siege', 'rainbow-six-siege'),
      ],
    }),
    createSportsFeedTab({
      id: 'tennis',
      chips: [
        createSportsFeedChip('atp', 'atp'),
        createSportsFeedChip('wta', 'wta'),
      ],
    }),
    createSportsFeedTab({
      id: 'cricket',
      chips: [
        createSportsFeedChip('international-cricket', 'international-cricket'),
        createSportsFeedChip('t20-blast', 't20-blast'),
      ],
    }),
    createSportsFeedTab({
      id: 'golf',
      chips: [
        createSportsFeedChip('pga-tour', 'pga-tour'),
        createSportsFeedChip('liv-golf', 'liv-golf'),
      ],
    }),
    createSportsFeedTab({
      id: 'combat',
      chips: [
        createSportsFeedChip('ufc', 'ufc'),
        createSportsFeedChip('boxing', 'boxing'),
      ],
    }),
    createSportsFeedTab({
      id: 'hockey',
      chips: [createSportsFeedChip('nhl', 'nhl')],
    }),
  ],
};
