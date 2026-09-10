import type {
  ChartPoint,
  ClosedFeedItem,
  DefaultFeedItem,
  FeedAudience,
  FeedItem,
  FeedTrader,
  PerpsBigFeedItem,
  PositionChart,
  TokenBigFeedItem,
} from './types';
import { TOKEN_LOGOS, TRADER_AVATARS } from './assets';

/**
 * Deterministic mock feed data for the SocialBundleV1 prototype.
 *
 * The feed cycles through the 4 entry variants (perps_big, token_big, closed,
 * default) so scrolling always shows a mix. `FEED_PAGE_SIZE` controls how many
 * items a "page" appends when the FlatList reaches its end, so the surface
 * feels infinite while remaining deterministic for QA + Design review.
 */

export const FEED_PAGE_SIZE = 20;

const TRADERS: Record<string, FeedTrader> = {
  pain: {
    id: 'pain',
    name: 'Pain',
    avatar: TRADER_AVATARS.pain,
    winRatePct: 95,
    tier: 'whale',
  },
  doji: {
    id: 'doji',
    name: 'Doji',
    avatar: TRADER_AVATARS.doji,
    winRatePct: 92,
    tier: 'whale',
  },
  nyhrox: {
    id: 'nyhrox',
    name: 'Nyhrox',
    avatar: TRADER_AVATARS.nyhrox,
    winRatePct: 75,
    tier: 'whale',
  },
  zuki: {
    id: 'zuki',
    name: 'Zuki',
    avatar: TRADER_AVATARS.zuki,
    winRatePct: 50,
    tier: 'shrimp',
  },
  daumen: {
    id: 'daumen',
    name: 'Daumen',
    avatar: TRADER_AVATARS.daumen,
    winRatePct: 81,
    tier: 'shrimp',
  },
  sebastian: {
    id: 'sebastian',
    name: 'Sebastian',
    avatar: TRADER_AVATARS.sebastian,
    winRatePct: 51,
    tier: 'whale',
  },
  jijo: {
    id: 'jijo',
    name: 'Jijo',
    avatar: TRADER_AVATARS.jijo,
    winRatePct: 73,
    tier: 'whale',
  },
  arnz: {
    id: 'arnz',
    name: 'arnz',
    avatar: TRADER_AVATARS.arnz,
    winRatePct: 76,
    tier: 'dolphin',
  },
};

/**
 * Build a normalized (0..1) chart line from a raw price series. Used by the
 * big-position cards to render a mocked-asset price arc with a marker where
 * the trader opened the position.
 */
const toChart = (
  prices: readonly number[],
  openIndex: number | null,
  trend: 'up' | 'down',
): PositionChart => {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points: ChartPoint[] = prices.map((price, i) => ({
    x: prices.length === 1 ? 0 : i / (prices.length - 1),
    y: (price - min) / range,
  }));
  return {
    points,
    openMarkerIndex: openIndex,
    trend,
  };
};

// Wavy series shaped like the BTC short chart in the Design screenshots:
// steady with a dip mid-way, a rebound, then a decline back to the end.
const BTC_SERIES = [
  0.72, 0.75, 0.7, 0.66, 0.6, 0.55, 0.58, 0.63, 0.7, 0.72, 0.68, 0.6, 0.55, 0.5,
  0.48, 0.47, 0.5, 0.55, 0.5, 0.45,
];

// PUMP: opens low, spikes up over the hold window.
const PUMP_SERIES = [
  0.28, 0.3, 0.32, 0.35, 0.34, 0.38, 0.42, 0.46, 0.5, 0.55, 0.6, 0.63, 0.66,
  0.7, 0.74, 0.78, 0.82, 0.85, 0.88, 0.9,
];

const PERPS_BIG: PerpsBigFeedItem = {
  id: 'perps_big_seed',
  type: 'perps_big',
  trader: TRADERS.doji,
  timeAgo: '5 min ago',
  postText: 'Leverage is a lifestyle.',
  footer: { likes: 2, comments: 2, reposts: 2 },
  position: {
    tokenSymbol: 'BTC',
    // No local BTC png — AvatarToken monogram renders from the symbol.
    tokenLogo: null,
    side: 'short',
    entryPrice: '$212,000.00',
    notional: '$38.0M',
    pnlAbs: '+$272,632.00',
    pnlPct: '+128.6%',
    leverage: '40X',
    takeProfit: '$101,214',
    stopLoss: '$110,905',
    liquidationPrice: '$110,367',
    chart: toChart(BTC_SERIES, 0, 'up'),
  },
};

const TOKEN_BIG: TokenBigFeedItem = {
  id: 'token_big_seed',
  type: 'token_big',
  trader: TRADERS.pain,
  timeAgo: '1 min ago',
  postText: 'Couldn’t resist.',
  footer: { likes: 12, comments: 4, reposts: 3 },
  position: {
    tokenSymbol: 'PUMP',
    tokenLogo: TOKEN_LOGOS.pump,
    side: 'buy',
    entryPrice: '$0.0₄4947',
    marketCap: '$128,400.00',
    volume: '$3.1B',
    pnlAbs: '+$95,272.80',
    pnlPct: '+74.2%',
    holdTime: '1d 20h',
    holdersTopPct: 48,
    holdersDevPct: 7,
    chart: toChart(PUMP_SERIES, 0, 'up'),
  },
};

const CLOSED: ClosedFeedItem = {
  id: 'closed_seed',
  type: 'closed',
  trader: TRADERS.pain,
  timeAgo: '3 min ago',
  postText: 'Risk managed. Mostly.',
  footer: { likes: 8, comments: 1, reposts: 1 },
  position: {
    tokenSymbol: 'ETH',
    tokenLogo: null,
    side: 'short',
    leverage: '15X',
    pnlAbs: '+$96,378.60',
    pnlPct: '+38.2%',
    entryPrice: '$1,890',
    exitPrice: '$1,842',
    maxHoldTime: '8h',
    status: 'closed',
  },
};

const DEFAULT_ITEM: DefaultFeedItem = {
  id: 'default_seed',
  type: 'default',
  trader: TRADERS.nyhrox,
  timeAgo: '1h ago',
  footer: { likes: 0, comments: 0, reposts: 0 },
  position: {
    tokenSymbol: 'PEPE',
    tokenLogo: null,
    side: 'buy',
    marketCap: '$4.2B MC',
    volume: '$44.5M',
    price: '$5,610.00',
    pnlPct: '+9.84%',
  },
};

const VARIANT_SEEDS: readonly FeedItem[] = [
  PERPS_BIG,
  TOKEN_BIG,
  CLOSED,
  DEFAULT_ITEM,
];

// Following = tighter subset so switching audiences visibly shortens the feed.
const FOLLOWING_TRADER_IDS = new Set(['pain', 'doji', 'nyhrox']);

/**
 * Deterministic page builder. Cycles the 4 variant seeds, stamping fresh IDs
 * and light per-item variations (different traders, different post text) so
 * long scrolls don't look like the same row copy-pasted.
 */
const buildItem = (globalIndex: number): FeedItem => {
  const seed = VARIANT_SEEDS[globalIndex % VARIANT_SEEDS.length];
  const traderList = Object.values(TRADERS);
  const trader = traderList[globalIndex % traderList.length];
  const id = `${seed.type}_${globalIndex}`;

  switch (seed.type) {
    case 'perps_big':
      return { ...seed, id, trader };
    case 'token_big':
      return { ...seed, id, trader };
    case 'closed':
      return { ...seed, id, trader };
    case 'default':
      return { ...seed, id, trader };
  }
};

export const buildFeedPage = (
  pageIndex: number,
  audience: FeedAudience,
): FeedItem[] => {
  const startIndex = pageIndex * FEED_PAGE_SIZE;
  const page = Array.from({ length: FEED_PAGE_SIZE }, (_, offset) =>
    buildItem(startIndex + offset),
  );
  if (audience === 'following') {
    return page.filter((item) => FOLLOWING_TRADER_IDS.has(item.trader.id));
  }
  return page;
};
