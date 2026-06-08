import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { predictMarketOptions } from '../queries/market';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictPosition,
} from '../types';
import { usePredictPositions } from './usePredictPositions';

export interface PredictSeriesPositionRow {
  position: PredictPosition;
  market: PredictMarket;
  marketStatus: PredictMarketStatus;
}

export interface UsePredictSeriesPositionsResult {
  rows: PredictSeriesPositionRow[];
  isLoading: boolean;
}

export interface UsePredictSeriesPositionsOptions {
  seriesId: string | undefined;
  seedMarkets?: PredictMarket[];
}

export function usePredictSeriesPositions({
  seriesId,
  seedMarkets,
}: UsePredictSeriesPositionsOptions): UsePredictSeriesPositionsResult {
  const enabled = Boolean(seriesId);

  const { data: activePositions = [], isLoading: isActiveLoading } =
    usePredictPositions({
      claimable: false,
      enabled,
      livePriceUpdates: true,
    });

  const { data: claimablePositions = [], isLoading: isClaimableLoading } =
    usePredictPositions({
      claimable: true,
      enabled,
    });

  const seedMarketsById = useMemo(() => {
    const map = new Map<string, PredictMarket>();
    seedMarkets?.forEach((m) => map.set(m.id, m));
    return map;
  }, [seedMarkets]);

  const positionMarketIds = useMemo(() => {
    const ids = new Set<string>();
    activePositions.forEach((p) => ids.add(p.marketId));
    claimablePositions.forEach((p) => ids.add(p.marketId));
    return Array.from(ids);
  }, [activePositions, claimablePositions]);

  const marketIdsNeedingFetch = useMemo(
    () => positionMarketIds.filter((id) => !seedMarketsById.has(id)),
    [positionMarketIds, seedMarketsById],
  );

  const marketQueries = useQueries({
    queries: marketIdsNeedingFetch.map((id) => ({
      ...predictMarketOptions({ marketId: id }),
      enabled,
    })),
  });

  const isAnyMarketLoading = marketQueries.some((q) => q.isLoading);

  const marketsById = useMemo(() => {
    const map = new Map<string, PredictMarket>(seedMarketsById);
    marketQueries.forEach((q) => {
      const market = q.data;
      if (market) {
        map.set(market.id, market);
      }
    });
    return map;
  }, [marketQueries, seedMarketsById]);

  const rows = useMemo<PredictSeriesPositionRow[]>(() => {
    if (!seriesId) {
      return [];
    }

    const matchesSeries = (marketId: string) => {
      const market = marketsById.get(marketId);
      return market?.series?.id === seriesId;
    };

    return [
      ...activePositions
        .filter((position) => matchesSeries(position.marketId))
        .map((position) => {
          const market = marketsById.get(position.marketId) as PredictMarket;

          return {
            position,
            market,
            marketStatus: market.status as PredictMarketStatus,
          };
        }),
      ...claimablePositions
        .filter((position) => matchesSeries(position.marketId))
        .map((position) => ({
          position,
          market: marketsById.get(position.marketId) as PredictMarket,
          marketStatus: PredictMarketStatus.CLOSED,
        })),
    ];
  }, [activePositions, claimablePositions, marketsById, seriesId]);

  return {
    rows,
    isLoading: isActiveLoading || isClaimableLoading || isAnyMarketLoading,
  };
}
