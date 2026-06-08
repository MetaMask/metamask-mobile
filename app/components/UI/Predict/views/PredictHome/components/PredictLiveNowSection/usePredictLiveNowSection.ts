import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BTC_UP_OR_DOWN_5M_SERIES } from '../../../../constants/btcUpDown5mSeries';
import { useCurrentPredictMarketFromSeries } from '../../../../hooks/useCurrentPredictMarketFromSeries';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import { selectPredictUpDownEnabledFlag } from '../../../../selectors/featureFlags';
import type { PredictMarket } from '../../../../types';
import { isCryptoUpDown } from '../../../../utils/cryptoUpDown';
import { interleaveLiveNowMarkets } from './liveNowInterleave';

/** Max live (sports) markets pulled for the Live Now rail (ticket v1). */
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
 * Pulls up to {@link LIVE_NOW_LIVE_LIMIT} live markets via the generic
 * `usePredictMarketList` ( `live: true` as a first-class param), plus the BTC
 * 5m Up/Down crypto market resolved from its series. The two are interleaved
 * (`2 live, 1 crypto, ...`) by {@link interleaveLiveNowMarkets}.
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

  const { markets: liveMarkets, isLoading: isLiveLoading } =
    usePredictMarketList({
      live: true,
      order: 'volume24hr',
      status: 'open',
      limit: LIVE_NOW_LIVE_LIMIT,
    });

  const { market: cryptoMarket, isLoading: isCryptoLoading } =
    useCurrentPredictMarketFromSeries({
      series: BTC_UP_OR_DOWN_5M_SERIES,
      enabled: upDownEnabled,
    });

  const cryptoMarkets = useMemo<PredictMarket[]>(() => {
    if (!upDownEnabled || !cryptoMarket || !isCryptoUpDown(cryptoMarket)) {
      return [];
    }
    return [cryptoMarket];
  }, [upDownEnabled, cryptoMarket]);

  const items = useMemo(
    () => interleaveLiveNowMarkets(liveMarkets, cryptoMarkets),
    [liveMarkets, cryptoMarkets],
  );

  const isLoading =
    (isLiveLoading || (upDownEnabled && isCryptoLoading)) && items.length === 0;
  const isEmpty = !isLoading && items.length === 0;

  return { items, isLoading, isEmpty };
};
