import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  BTC_UP_OR_DOWN_5M_SERIES,
  ETH_UP_OR_DOWN_5M_SERIES,
  BTC_UP_OR_DOWN_15M_SERIES,
} from '../../../../constants/liveNowCryptoSeries';
import { useCurrentPredictMarketFromSeries } from '../../../../hooks/useCurrentPredictMarketFromSeries';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import { selectPredictUpDownEnabledFlag } from '../../../../selectors/featureFlags';
import type { PredictMarket } from '../../../../types';
import { isCryptoUpDown } from '../../../../utils/cryptoUpDown';
import { interleaveLiveNowMarkets } from './liveNowInterleave';

/**
 * Over-fetch live markets so client-side filtering (keep scoreboard-capable
 * markets only) still leaves enough to fill the rail.
 *
 * Kept deliberately modest: `listMarkets` does not resolve until the provider
 * has loaded the team rosters for every sports league present in the batch
 * (one `/teams` request per league, all awaited before any market returns).
 * A larger limit pulls in more leagues and makes the whole live list wait on
 * the slowest roster fetch, so this is tuned to roughly 2x the display cap
 * rather than a blanket over-fetch.
 */
export const LIVE_NOW_FETCH_LIMIT = 15;

/** Max live (scoreboard) markets displayed in the Live Now rail after filtering. */
export const LIVE_NOW_LIVE_LIMIT = 7;

export interface UsePredictLiveNowSectionResult {
  /** Interleaved live + crypto markets ready for the carousel. */
  items: PredictMarket[];
  /** Initial load with nothing to show yet (render skeletons). */
  isLoading: boolean;
  /** No data after load (hide the section entirely). */
  isEmpty: boolean;
}

/**
 * Data source for the Predict home "Live Now" carousel.
 *
 * Pulls live markets via the generic `usePredictMarketList` (`live: true` as a
 * first-class param), then keeps only the scoreboard-capable ones (`market.game`
 * present) — the generic-card "regular" markets are filtered out. Because that
 * filtering happens client-side, the query is over-fetched
 * ({@link LIVE_NOW_FETCH_LIMIT}) and the survivors are capped at
 * {@link LIVE_NOW_LIVE_LIMIT}.
 *
 * Alongside, the BTC 5m / ETH 5m / BTC 15m Up/Down crypto markets are resolved
 * from their series and interleaved (`2 live, 1 crypto, ...`) by
 * {@link interleaveLiveNowMarkets} (crypto capped at 3).
 *
 * Crypto is only included when the Up/Down feature flag is on — `PredictMarket`
 * itself only renders the crypto card when that flag is enabled, so gating here
 * keeps the data and the renderer in sync.
 *
 * Errors are non-blocking: `usePredictMarketList` returns `[]` rather than
 * throwing, so a failed fetch collapses to the empty (hidden) state and never
 * blocks the home screen.
 */
export const usePredictLiveNowSection = (): UsePredictLiveNowSectionResult => {
  const upDownEnabled = useSelector(selectPredictUpDownEnabledFlag);

  const { markets: liveMarketsRaw, isLoading: isLiveLoading } =
    usePredictMarketList({
      live: true,
      order: 'volume24hr',
      status: 'open',
      limit: LIVE_NOW_FETCH_LIMIT,
    });

  // Keep only scoreboard-capable live markets (those with `game`); drop the
  // generic-card "regular" markets, then cap to the display limit.
  const liveMarkets = useMemo(
    () =>
      liveMarketsRaw
        .filter((market) => Boolean(market.game))
        .slice(0, LIVE_NOW_LIVE_LIMIT),
    [liveMarketsRaw],
  );

  const btc5m = useCurrentPredictMarketFromSeries({
    series: BTC_UP_OR_DOWN_5M_SERIES,
    enabled: upDownEnabled,
  });
  const eth5m = useCurrentPredictMarketFromSeries({
    series: ETH_UP_OR_DOWN_5M_SERIES,
    enabled: upDownEnabled,
  });
  const btc15m = useCurrentPredictMarketFromSeries({
    series: BTC_UP_OR_DOWN_15M_SERIES,
    enabled: upDownEnabled,
  });

  const cryptoMarkets = useMemo<PredictMarket[]>(() => {
    if (!upDownEnabled) {
      return [];
    }
    return [btc5m.market, eth5m.market, btc15m.market].filter(
      (market): market is PredictMarket =>
        Boolean(market) && isCryptoUpDown(market as PredictMarket),
    );
  }, [upDownEnabled, btc5m.market, eth5m.market, btc15m.market]);

  const items = useMemo(
    () => interleaveLiveNowMarkets(liveMarkets, cryptoMarkets),
    [liveMarkets, cryptoMarkets],
  );

  const isCryptoLoading =
    btc5m.isLoading || eth5m.isLoading || btc15m.isLoading;

  // Reveal the rail only once its primary content (the live list) has settled,
  // and — when crypto is enabled — the crypto series too. Crypto markets carry
  // no team rosters so they resolve almost immediately; gating purely on
  // `items.length` would otherwise flash a crypto-only rail and then reflow
  // when the slower live games land. Crypto is fast, so also waiting on it adds
  // negligible delay while guaranteeing a single, stable reveal.
  const isLoading = isLiveLoading || (upDownEnabled && isCryptoLoading);
  const isEmpty = !isLoading && items.length === 0;

  return { items, isLoading, isEmpty };
};
