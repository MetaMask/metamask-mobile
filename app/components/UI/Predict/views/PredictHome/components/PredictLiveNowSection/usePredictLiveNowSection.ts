import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  BTC_UP_OR_DOWN_5M_SERIES,
  ETH_UP_OR_DOWN_5M_SERIES,
  BTC_UP_OR_DOWN_15M_SERIES,
} from '../../../../constants/liveNowCryptoSeries';
import { useCurrentPredictMarketFromSeries } from '../../../../hooks/useCurrentPredictMarketFromSeries';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import {
  selectPredictFeedCarouselConfig,
  selectPredictUpDownEnabledFlag,
} from '../../../../selectors/featureFlags';
import type { PredictMarket, PredictMarketListParams } from '../../../../types';
import type { PredictFeedCarouselConfig } from '../../../../types/flags';
import { isCryptoUpDown } from '../../../../utils/cryptoUpDown';
import { interleaveLiveNowMarkets } from './liveNowInterleave';

/**
 * Over-fetch live markets so client-side filtering (keep sports game markets
 * only) still leaves enough to fill the rail.
 *
 * Kept deliberately modest: `listMarkets` does not resolve until the provider
 * has loaded the team rosters for every sports league present in the batch
 * (one `/teams` request per league, all awaited before any market returns).
 * A larger limit pulls in more leagues and makes the whole live list wait on
 * the slowest roster fetch, so this is tuned to roughly 2x the display cap
 * rather than a blanket over-fetch.
 */
export const LIVE_NOW_FETCH_LIMIT = 15;

/** Max sports game markets displayed in the Live Now rail after filtering. */
export const LIVE_NOW_LIVE_LIMIT = 7;

/** Max cards displayed when the carousel uses a custom content source. */
export const CUSTOM_FEED_CAROUSEL_LIMIT = 10;

export interface UsePredictLiveNowSectionResult {
  /** Markets curated for the selected live or custom mode. */
  items: PredictMarket[];
  /** Initial load with nothing to show yet (render skeletons). */
  isLoading: boolean;
  /** No data after load (hide the section entirely). */
  isEmpty: boolean;
  /** Validated remote configuration used by the section header and query. */
  config: PredictFeedCarouselConfig;
}

/**
 * Data source for the configurable Predict home feed carousel.
 *
 * Live mode pulls markets with `live: true`, keeps sports game results,
 * and preserves the existing crypto interleave. Custom mode uses the configured
 * raw query params and removes remotely excluded market IDs. Its `live-now`
 * composition reuses the PRED-834 sports-card/crypto behavior, while
 * `query-results` renders query results directly. An empty query uses the
 * provider defaults for top open markets by 24-hour volume.
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
  const config = useSelector(selectPredictFeedCarouselConfig);
  const isCustom = config.mode === 'custom';
  const usesLiveNowComposition =
    !isCustom || config.contentSource.composition === 'live-now';
  const includeCrypto = usesLiveNowComposition && upDownEnabled;
  const excludedMarketIds = useMemo(
    () => new Set(isCustom ? config.contentSource.excludedMarketIds : []),
    [config.contentSource.excludedMarketIds, isCustom],
  );

  const marketListParams: PredictMarketListParams = isCustom
    ? {
        order: 'volume24hr',
        status: 'open',
        limit: LIVE_NOW_FETCH_LIMIT,
        ...(config.contentSource.queryParams
          ? { customQueryParams: config.contentSource.queryParams }
          : {}),
      }
    : {
        live: true,
        order: 'volume24hr',
        status: 'open',
        limit: LIVE_NOW_FETCH_LIMIT,
      };

  const { markets: marketsRaw, isLoading: isMarketListLoading } =
    usePredictMarketList(marketListParams);

  // Keep only sports game markets (those with `game`); drop standard-card
  // markets, then cap to the display limit.
  const liveMarkets = useMemo(
    () =>
      marketsRaw
        .filter((market) => Boolean(market.game))
        .filter((market) => !excludedMarketIds.has(market.id))
        .slice(0, LIVE_NOW_LIVE_LIMIT),
    [excludedMarketIds, marketsRaw],
  );

  const customMarkets = useMemo(
    () =>
      marketsRaw
        .filter((market) => !excludedMarketIds.has(market.id))
        .slice(0, CUSTOM_FEED_CAROUSEL_LIMIT),
    [excludedMarketIds, marketsRaw],
  );

  const btc5m = useCurrentPredictMarketFromSeries({
    series: BTC_UP_OR_DOWN_5M_SERIES,
    enabled: includeCrypto,
  });
  const eth5m = useCurrentPredictMarketFromSeries({
    series: ETH_UP_OR_DOWN_5M_SERIES,
    enabled: includeCrypto,
  });
  const btc15m = useCurrentPredictMarketFromSeries({
    series: BTC_UP_OR_DOWN_15M_SERIES,
    enabled: includeCrypto,
  });

  const cryptoMarkets = useMemo<PredictMarket[]>(() => {
    if (!includeCrypto) {
      return [];
    }
    return [btc5m.market, eth5m.market, btc15m.market].filter(
      (market): market is PredictMarket =>
        market !== undefined &&
        isCryptoUpDown(market) &&
        !excludedMarketIds.has(market.id),
    );
  }, [
    includeCrypto,
    btc5m.market,
    eth5m.market,
    btc15m.market,
    excludedMarketIds,
  ]);

  const items = useMemo(
    () =>
      usesLiveNowComposition
        ? interleaveLiveNowMarkets(liveMarkets, cryptoMarkets)
        : customMarkets,
    [cryptoMarkets, customMarkets, liveMarkets, usesLiveNowComposition],
  );

  const isCryptoLoading =
    btc5m.isLoading || eth5m.isLoading || btc15m.isLoading;

  // Reveal the rail only once its primary content (the live list) has settled,
  // and — when crypto is enabled — the crypto series too. Crypto markets carry
  // no team rosters so they resolve almost immediately; gating purely on
  // `items.length` would otherwise flash a crypto-only rail and then reflow
  // when the slower live games land. Crypto is fast, so also waiting on it adds
  // negligible delay while guaranteeing a single, stable reveal.
  const isLoading = isMarketListLoading || (includeCrypto && isCryptoLoading);
  const isEmpty = !isLoading && items.length === 0;

  return { items, isLoading, isEmpty, config };
};
