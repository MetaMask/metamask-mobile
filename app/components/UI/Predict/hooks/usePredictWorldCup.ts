import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import {
  getPredictWorldCupAvailableTabKeys,
  PREDICT_WORLD_CUP_TAB_KEYS,
  type PredictWorldCupTabAvailability,
  type PredictWorldCupTabKey,
} from '../constants/worldCupTabs';
import {
  buildPredictWorldCupAllQuery,
  buildPredictWorldCupLiveQuery,
  buildPredictWorldCupPropsQuery,
  buildPredictWorldCupStageEventsQuery,
  resolvePredictWorldCupStageLabel,
} from '../utils/worldCup';
import { sortPredictWorldCupMarketsByStartTime } from '../services/worldCup';
import {
  usePredictMarketData,
  type UsePredictMarketDataResult,
} from './usePredictMarketData';
import type { PredictWorldCupConfig } from '../types/flags';

export interface UsePredictWorldCupMarketsOptions {
  tabKey: PredictWorldCupTabKey;
  config: Pick<
    PredictWorldCupConfig,
    'seriesId' | 'tagSlug' | 'gamesTagId' | 'stages'
  >;
  enabled?: boolean;
  pageSize?: number;
}

export interface UsePredictWorldCupAvailableTabsOptions {
  enabled?: boolean;
}

export interface PredictWorldCupAvailableTab {
  key: PredictWorldCupTabKey;
  label: string;
  isLive?: boolean;
}

interface WorldCupMarketDataConfig {
  queryParams: string;
  pageSize?: number;
  paginationEnabled: boolean;
  refine?: UsePredictWorldCupMarketRefine;
  enabled: boolean;
}

type UsePredictWorldCupMarketRefine = NonNullable<
  Parameters<typeof usePredictMarketData>[0]
>['refine'];

const DEFAULT_WORLD_CUP_MARKETS_OPTIONS = {
  enabled: true,
} as const;

const getWorldCupMarketDataConfig = ({
  tabKey,
  config,
  enabled = true,
  pageSize,
}: UsePredictWorldCupMarketsOptions): WorldCupMarketDataConfig => {
  switch (tabKey) {
    case PREDICT_WORLD_CUP_TAB_KEYS.ALL:
      return {
        queryParams: buildPredictWorldCupAllQuery(config),
        pageSize,
        paginationEnabled: true,
        enabled,
      };
    case PREDICT_WORLD_CUP_TAB_KEYS.PROPS:
      return {
        queryParams: buildPredictWorldCupPropsQuery(config),
        pageSize,
        paginationEnabled: true,
        enabled,
      };
    case PREDICT_WORLD_CUP_TAB_KEYS.LIVE:
      return {
        queryParams: buildPredictWorldCupLiveQuery(config),
        pageSize,
        paginationEnabled: false,
        enabled,
      };
    default: {
      const stage = config.stages.find(
        (configuredStage) => configuredStage.key === tabKey,
      );

      if (!stage || stage.eventIds.length === 0) {
        return {
          queryParams: '',
          paginationEnabled: false,
          enabled: false,
        };
      }

      return {
        queryParams: buildPredictWorldCupStageEventsQuery(stage),
        pageSize: stage.eventIds.length,
        paginationEnabled: false,
        refine: sortPredictWorldCupMarketsByStartTime,
        enabled,
      };
    }
  }
};

export const usePredictWorldCupMarkets = ({
  tabKey,
  config,
  enabled = DEFAULT_WORLD_CUP_MARKETS_OPTIONS.enabled,
  pageSize,
}: UsePredictWorldCupMarketsOptions): UsePredictMarketDataResult => {
  const marketDataConfig = useMemo(
    () =>
      getWorldCupMarketDataConfig({
        tabKey,
        config,
        enabled,
        pageSize,
      }),
    [config, enabled, pageSize, tabKey],
  );

  const marketData = usePredictMarketData({
    category: 'hot',
    customQueryParams: marketDataConfig.queryParams,
    pageSize: marketDataConfig.pageSize,
    refine: marketDataConfig.refine,
    enabled: marketDataConfig.enabled,
  });

  if (marketDataConfig.paginationEnabled) {
    return marketData;
  }

  return {
    ...marketData,
    hasMore: false,
    isFetchingMore: false,
    fetchMore: async () => undefined,
  };
};

export const usePredictWorldCupAvailability = (
  config: Pick<
    PredictWorldCupConfig,
    'seriesId' | 'tagSlug' | 'gamesTagId' | 'stages'
  >,
  options: UsePredictWorldCupAvailableTabsOptions = DEFAULT_WORLD_CUP_MARKETS_OPTIONS,
) => {
  const enabled = options.enabled ?? true;
  const queries = useQueries({
    queries: [
      predictQueries.worldCup.options.availability.live(config),
      predictQueries.worldCup.options.availability.props(config),
      ...config.stages.map((stage) =>
        predictQueries.worldCup.options.availability.stage(stage),
      ),
    ].map((queryOption) => ({
      ...queryOption,
      enabled,
    })),
  });

  const availability: PredictWorldCupTabAvailability = {
    live: queries[0]?.data ?? false,
    props: queries[1]?.data ?? false,
    stages: config.stages.reduce<Record<string, boolean>>(
      (accumulator, stage, index) => ({
        ...accumulator,
        [stage.key]: queries[index + 2]?.data ?? false,
      }),
      {},
    ),
  };

  return {
    availability,
    isFetching: queries.some((query) => query.isFetching),
    isLoading: queries.some((query) => query.isLoading),
    errors: queries.map((query) => query.error),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
};

export const usePredictWorldCupAvailableTabs = (
  config: Pick<
    PredictWorldCupConfig,
    'seriesId' | 'tagSlug' | 'gamesTagId' | 'stages'
  >,
  options: UsePredictWorldCupAvailableTabsOptions = DEFAULT_WORLD_CUP_MARKETS_OPTIONS,
) => {
  const { availability, ...availabilityQuery } = usePredictWorldCupAvailability(
    config,
    options,
  );

  const tabs = useMemo<PredictWorldCupAvailableTab[]>(() => {
    const availableKeys = getPredictWorldCupAvailableTabKeys(
      config,
      availability,
    );

    return availableKeys.map((key) => {
      switch (key) {
        case PREDICT_WORLD_CUP_TAB_KEYS.ALL:
          return { key, label: 'All' };
        case PREDICT_WORLD_CUP_TAB_KEYS.LIVE:
          return { key, label: 'Live', isLive: true };
        case PREDICT_WORLD_CUP_TAB_KEYS.PROPS:
          return { key, label: 'Props' };
        default: {
          const stage = config.stages.find(
            (configuredStage) => configuredStage.key === key,
          );
          return {
            key,
            label: stage ? resolvePredictWorldCupStageLabel(stage) : key,
          };
        }
      }
    });
  }, [availability, config]);

  return {
    ...availabilityQuery,
    availability,
    tabs,
  };
};
