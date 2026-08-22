import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTrendingRequest } from '../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import { usePerpsTopMovers } from '../../Perps/hooks/usePerpsTopMovers';
import { usePredictMarketData } from '../../Predict/hooks/usePredictMarketData';
import { useWhatsHappening } from '../../WhatsHappening/hooks';
import { useTopTraders } from '../../../Views/Homepage/Sections/TopTraders/hooks/useTopTraders';
import { selectPerpsEnabledFlag } from '../../Perps';
import { selectPredictEnabledFlag } from '../../Predict';
import type { PredictMarket } from '../../Predict/types';
import {
  DECK_LOAD_TIMEOUT_MS,
  DECK_MIX,
  DECK_SIZE,
  DECK_TYPE_PRIORITY,
  SETTLE_GRACE_MS,
} from '../constants';
import type { DeckCard, DeckCardType } from '../types';
import {
  repairAdjacentDuplicates,
  seededShuffle,
} from '../utils/seededShuffle';
import { getCurrentHourSeed } from '../utils/exploreCardsSession';

export interface UseExploreCardsDeckResult {
  /** The composed deck, `null` while feeds are still being awaited. */
  deck: DeckCard[] | null;
  isLoading: boolean;
  /** True when every feed settled/timed out and nothing usable arrived. */
  isError: boolean;
  retry: () => void;
  /** Deals a fresh, differently-shuffled deck from the loaded pools. */
  reshuffle: () => void;
}

/** Binary Yes/No markets only; sports (`game`) markets are out of POC scope. */
const isBinaryNonSportsMarket = (market: PredictMarket): boolean =>
  !market.game &&
  market.outcomes.length === 1 &&
  market.outcomes[0].tokens.length >= 2;

/**
 * Composes the deck from per-type candidate pools: quota pass first, then a
 * priority-ordered redistribution of any shortfall, then an hour-seeded
 * shuffle with an adjacency repair pass, ending with a crypto card first.
 */
export const composeDeck = (
  pools: Record<DeckCardType, DeckCard[]>,
  seed: number,
): DeckCard[] => {
  const cursors: Record<DeckCardType, number> = {
    crypto: 0,
    perp: 0,
    prediction: 0,
    news: 0,
    trader: 0,
  };
  const taken: DeckCard[] = [];

  for (const type of DECK_TYPE_PRIORITY) {
    const quota = DECK_MIX[type];
    while (cursors[type] < Math.min(quota, pools[type].length)) {
      taken.push(pools[type][cursors[type]]);
      cursors[type] += 1;
    }
  }

  // Redistribute shortfall: pull further down the feeds in priority order.
  for (const type of DECK_TYPE_PRIORITY) {
    while (taken.length < DECK_SIZE && cursors[type] < pools[type].length) {
      taken.push(pools[type][cursors[type]]);
      cursors[type] += 1;
    }
  }

  const shuffled = repairAdjacentDuplicates(
    seededShuffle(taken, seed),
    (card) => card.type,
  );

  // Lead with a crypto card — the most universally legible type.
  const firstCryptoIndex = shuffled.findIndex((card) => card.type === 'crypto');
  if (firstCryptoIndex > 0) {
    [shuffled[0], shuffled[firstCryptoIndex]] = [
      shuffled[firstCryptoIndex],
      shuffled[0],
    ];
  }

  return shuffled;
};

/**
 * The only place that touches data for the Explore Cards deck. Calls the five
 * upstream feed hooks, freezes the deck once enough data is available (or the
 * timeout elapses) so cards never shift under the user mid-session.
 */
export const useExploreCardsDeck = (): UseExploreCardsDeckResult => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const trending = useTrendingRequest({
    sort: 'h1_trending',
    filterLowQuality: true,
  });
  const perps = usePerpsTopMovers({
    direction: 'desc',
    enabled: isPerpsEnabled,
  });
  const predictions = usePredictMarketData({
    category: 'trending',
    pageSize: DECK_SIZE,
    enabled: isPredictEnabled,
  });
  const news = useWhatsHappening(DECK_SIZE);
  const traders = useTopTraders({ limit: DECK_SIZE });

  const pools = useMemo((): Record<DeckCardType, DeckCard[]> => {
    // Prefer surfacing a trader the user does not already follow.
    const orderedTraders = [
      ...traders.traders.filter((trader) => !trader.isFollowing),
      ...traders.traders.filter((trader) => trader.isFollowing),
    ];

    return {
      crypto: trending.results.slice(0, DECK_SIZE).map((token) => ({
        type: 'crypto',
        id: `crypto-${token.assetId}`,
        data: token,
      })),
      perp: perps.data.slice(0, DECK_SIZE).map((market) => ({
        type: 'perp',
        id: `perp-${market.symbol}`,
        data: market,
      })),
      prediction: predictions.marketData
        .filter(isBinaryNonSportsMarket)
        .slice(0, DECK_SIZE)
        .map((market) => ({
          type: 'prediction',
          id: `prediction-${market.id}`,
          data: market,
        })),
      news: news.items.slice(0, DECK_SIZE).map((item, feedIndex) => ({
        type: 'news',
        id: `news-${item.id}`,
        data: item,
        feedIndex,
      })),
      trader: orderedTraders.slice(0, DECK_SIZE).map((trader) => ({
        type: 'trader',
        id: `trader-${trader.id}`,
        data: trader,
      })),
    };
  }, [
    trending.results,
    perps.data,
    predictions.marketData,
    news.items,
    traders.traders,
  ]);

  const allSettled =
    !trending.isLoading &&
    !perps.isLoading &&
    !predictions.isFetching &&
    !news.isLoading &&
    !traders.isLoading;

  const [deck, setDeck] = useState<DeckCard[] | null>(null);
  const [seed, setSeed] = useState<number>(() => getCurrentHourSeed());
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isSettleArmed, setIsSettleArmed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setIsTimedOut(false);
    setIsSettleArmed(false);
    const graceTimer = setTimeout(
      () => setIsSettleArmed(true),
      SETTLE_GRACE_MS,
    );
    const timeout = setTimeout(() => setIsTimedOut(true), DECK_LOAD_TIMEOUT_MS);
    return () => {
      clearTimeout(graceTimer);
      clearTimeout(timeout);
    };
  }, [retryToken]);

  // Freeze the deck exactly once per seed: either when every feed has
  // settled (only trusted after the arming grace — some hooks report
  // not-loading on their very first render) or when the hard timeout
  // elapses. Freezing any earlier composes a mono-type deck from whichever
  // feed answers first (in practice: all perps, off the live stream).
  useEffect(() => {
    if (deck !== null) {
      return;
    }
    if ((allSettled && isSettleArmed) || isTimedOut) {
      setDeck(composeDeck(pools, seed));
    }
  }, [deck, pools, seed, allSettled, isSettleArmed, isTimedOut]);

  const retry = useCallback(() => {
    setDeck(null);
    setRetryToken((token) => token + 1);
    // Perps data is stream-driven and has no manual refetch; the others do.
    void trending.fetch();
    void predictions.refetch();
    void news.refresh();
    void traders.refresh().catch(() => undefined);
  }, [trending, predictions, news, traders]);

  const reshuffle = useCallback(() => {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setDeck(null);
  }, []);

  return {
    deck,
    isLoading: deck === null,
    isError: deck !== null && deck.length === 0,
    retry,
    reshuffle,
  };
};
