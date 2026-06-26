import { useCallback, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import { resolvePredictWorldCupStageLabel } from '../utils/worldCup';
import { filterStandaloneMarkets } from '../utils/feed';
import { getVisiblePredictMarkets } from '../utils/marketStaleness';
import type { PredictMarket } from '../types';
import type { PredictWorldCupConfig } from '../types/flags';

type WorldCupHubDataConfig = Pick<
  PredictWorldCupConfig,
  'tagSlug' | 'gamesTagId' | 'stages' | 'winnerEventId'
>;

export interface PredictWorldCupStageSection {
  key: string;
  label: string;
  markets: PredictMarket[];
  isFetching: boolean;
}

export interface UsePredictWorldCupGamesSectionsResult {
  sections: PredictWorldCupStageSection[];
  isLive: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches all configured knockout-stage event groups in parallel and returns
 * them as ordered sections. Sections with no visible markets are omitted so
 * completed stages disappear automatically. The order follows `config.stages`
 * (i.e. the remote config canonical order) and market order within each
 * section is preserved as returned by the Polymarket API — no client-side sort.
 */
export const usePredictWorldCupGamesSections = (
  config: WorldCupHubDataConfig,
  options: { enabled?: boolean } = {},
): UsePredictWorldCupGamesSectionsResult => {
  const enabled = options.enabled ?? true;

  const stageQueryResults = useQueries({
    queries: config.stages.map((stage) => ({
      ...predictQueries.worldCup.options.stage(stage),
      enabled,
    })),
  });

  // Only the live availability flag is consumed here, so query it directly
  // instead of pulling in the full availability fan-out (live + props +
  // per-stage) from usePredictWorldCupAvailability.
  const { data: isLive, refetch: refetchLiveAvailability } = useQuery({
    ...predictQueries.worldCup.options.availability.live(config),
    enabled,
  });

  const sections = useMemo<PredictWorldCupStageSection[]>(
    () =>
      config.stages
        .map((stage, index) => {
          const result = stageQueryResults[index];
          const rawMarkets = result?.data ?? [];
          const markets = getVisiblePredictMarkets(
            filterStandaloneMarkets(rawMarkets),
          );
          return {
            key: stage.key,
            label: resolvePredictWorldCupStageLabel(stage),
            markets,
            isFetching: result?.isLoading ?? false,
          };
        })
        .filter((section) => section.markets.length > 0),
    [config.stages, stageQueryResults],
  );

  const isFetching = stageQueryResults.some((r) => r.isLoading);

  // Only stage (content) query failures should surface as an offline/error
  // state. The live-availability query just powers the Games tab live dot, so
  // its failure must not hide the normal empty state when stages return no
  // markets.
  const error = stageQueryResults.find((r) => r.error)?.error?.message ?? null;

  const refetch = useCallback(async () => {
    await Promise.all([
      ...stageQueryResults.map((r) => r.refetch()),
      refetchLiveAvailability(),
    ]);
  }, [stageQueryResults, refetchLiveAvailability]);

  return {
    sections,
    isLive: isLive ?? false,
    isFetching,
    error,
    refetch,
  };
};

export interface UsePredictWorldCupWinnerMarketResult {
  market: PredictMarket | null;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches the single "Who will win the World Cup?" multi-outcome market using
 * the `winnerEventId` from remote config. Returns `null` when not configured.
 */
export const usePredictWorldCupWinnerMarket = (
  config: WorldCupHubDataConfig,
  options: { enabled?: boolean } = {},
): UsePredictWorldCupWinnerMarketResult => {
  const enabled = (options.enabled ?? true) && Boolean(config.winnerEventId);
  const winnerStage = useMemo(
    () =>
      config.winnerEventId
        ? { key: 'winner', eventIds: [config.winnerEventId] }
        : null,
    [config.winnerEventId],
  );

  const queryOptions = useMemo(
    () =>
      winnerStage
        ? predictQueries.worldCup.options.stage(winnerStage)
        : predictQueries.worldCup.options.stage({
            key: 'winner-disabled',
            eventIds: [],
          }),
    [winnerStage],
  );

  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    ...queryOptions,
    enabled,
  });

  const market = useMemo(() => {
    if (!data || data.length === 0) return null;
    const visible = getVisiblePredictMarkets(filterStandaloneMarkets(data));
    return visible[0] ?? null;
  }, [data]);

  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  return {
    market,
    isFetching: isLoading,
    error: error?.message ?? null,
    refetch,
  };
};
