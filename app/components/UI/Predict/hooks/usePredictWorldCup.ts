import { useCallback, useEffect, useMemo } from 'react';
import {
  queryOptions,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
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
import {
  fetchPredictWorldCupMarkets,
  PREDICT_WORLD_CUP_PAGE_SIZE,
} from '../services/worldCup';
import { strings } from '../../../../../locales/i18n';
import type { PredictMarket } from '../types';
import type { PredictWorldCupConfig } from '../types/flags';
import type { UsePredictMarketDataResult } from './usePredictMarketData';

export interface UsePredictWorldCupMarketsOptions {
  tabKey: PredictWorldCupTabKey;
  config: PredictWorldCupDataConfig;
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

type PredictWorldCupDataConfig = Pick<
  PredictWorldCupConfig,
  'seriesId' | 'tagSlug' | 'gamesTagId' | 'stages'
>;

interface WorldCupMarketDataConfig {
  tabKey: PredictWorldCupTabKey;
  queryParams: string;
  pageSize: number;
  paginationEnabled: boolean;
  enabled: boolean;
  stage?: PredictWorldCupConfig['stages'][number];
}

const DEFAULT_WORLD_CUP_MARKETS_OPTIONS = {
  enabled: true,
} as const;

const PREDICT_WORLD_CUP_MARKETS_STALE_TIME = 10_000;

const getStage = (
  config: PredictWorldCupDataConfig,
  tabKey: PredictWorldCupTabKey,
): PredictWorldCupConfig['stages'][number] | undefined =>
  config.stages.find((configuredStage) => configuredStage.key === tabKey);

const getWorldCupMarketDataConfig = ({
  tabKey,
  config,
  enabled = true,
  pageSize = PREDICT_WORLD_CUP_PAGE_SIZE,
}: UsePredictWorldCupMarketsOptions): WorldCupMarketDataConfig => {
  switch (tabKey) {
    case PREDICT_WORLD_CUP_TAB_KEYS.ALL:
      return {
        tabKey,
        queryParams: buildPredictWorldCupAllQuery(config),
        pageSize,
        paginationEnabled: true,
        enabled,
      };
    case PREDICT_WORLD_CUP_TAB_KEYS.PROPS:
      return {
        tabKey,
        queryParams: buildPredictWorldCupPropsQuery(config),
        pageSize,
        paginationEnabled: true,
        enabled,
      };
    case PREDICT_WORLD_CUP_TAB_KEYS.LIVE:
      return {
        tabKey,
        queryParams: buildPredictWorldCupLiveQuery(config),
        pageSize,
        paginationEnabled: false,
        enabled,
      };
    default: {
      const stage = getStage(config, tabKey);

      if (!stage || stage.eventIds.length === 0) {
        return {
          tabKey,
          queryParams: '',
          pageSize,
          paginationEnabled: false,
          enabled: false,
        };
      }

      return {
        tabKey,
        queryParams: buildPredictWorldCupStageEventsQuery(stage),
        pageSize: stage.eventIds.length,
        paginationEnabled: false,
        enabled,
        stage,
      };
    }
  }
};

const getSingleWorldCupMarketQueryOptions = (
  marketDataConfig: WorldCupMarketDataConfig,
  config: PredictWorldCupDataConfig,
) => {
  if (marketDataConfig.tabKey === PREDICT_WORLD_CUP_TAB_KEYS.LIVE) {
    return predictQueries.worldCup.options.live(config, {
      limit: marketDataConfig.pageSize,
    });
  }

  if (marketDataConfig.stage) {
    return predictQueries.worldCup.options.stage(marketDataConfig.stage);
  }

  return queryOptions<PredictMarket[], Error>({
    queryKey: [
      ...predictQueries.worldCup.keys.all(),
      'disabled',
      marketDataConfig.tabKey,
    ],
    queryFn: async () => [],
    staleTime: PREDICT_WORLD_CUP_MARKETS_STALE_TIME,
  });
};

const fetchInfiniteWorldCupMarketsPage = async ({
  queryParams,
  pageSize,
  pageParam,
}: {
  queryParams: string;
  pageSize: number;
  pageParam?: unknown;
}) =>
  fetchPredictWorldCupMarkets({
    queryParams,
    limit: pageSize,
    afterCursor: typeof pageParam === 'string' ? pageParam : null,
  });

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

  const infiniteQuery = useInfiniteQuery<PredictMarket[], Error>({
    queryKey: predictQueries.worldCup.keys.infiniteMarkets(
      marketDataConfig.tabKey,
      marketDataConfig.queryParams,
      marketDataConfig.pageSize,
    ),
    queryFn: ({ pageParam }) =>
      fetchInfiniteWorldCupMarketsPage({
        queryParams: marketDataConfig.queryParams,
        pageSize: marketDataConfig.pageSize,
        pageParam,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length >= marketDataConfig.pageSize
        ? allPages.length * marketDataConfig.pageSize
        : undefined,
    enabled: marketDataConfig.enabled && marketDataConfig.paginationEnabled,
    staleTime: PREDICT_WORLD_CUP_MARKETS_STALE_TIME,
  });

  const singleQueryOptions = useMemo(
    () => getSingleWorldCupMarketQueryOptions(marketDataConfig, config),
    [config, marketDataConfig],
  );
  const singleQuery = useQuery({
    ...singleQueryOptions,
    enabled: marketDataConfig.enabled && !marketDataConfig.paginationEnabled,
  });

  const fetchMore = useCallback(async () => {
    if (!marketDataConfig.paginationEnabled) {
      return;
    }

    await infiniteQuery.fetchNextPage();
  }, [infiniteQuery, marketDataConfig.paginationEnabled]);

  const refetch = useCallback(async () => {
    if (marketDataConfig.paginationEnabled) {
      await infiniteQuery.refetch();
      return;
    }

    await singleQuery.refetch();
  }, [infiniteQuery, marketDataConfig.paginationEnabled, singleQuery]);

  if (marketDataConfig.paginationEnabled) {
    return {
      marketData: infiniteQuery.data?.pages.flat() ?? [],
      isFetching: infiniteQuery.isLoading,
      isFetchingMore: infiniteQuery.isFetchingNextPage,
      error: infiniteQuery.error?.message ?? null,
      hasMore: infiniteQuery.hasNextPage ?? false,
      refetch,
      fetchMore,
    };
  }

  return {
    marketData: singleQuery.data ?? [],
    isFetching: singleQuery.isLoading,
    isFetchingMore: false,
    error: singleQuery.error?.message ?? null,
    hasMore: false,
    refetch,
    fetchMore,
  };
};

const prefetchWorldCupTabMarkets = ({
  queryClient,
  tabKey,
  config,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  tabKey: PredictWorldCupTabKey;
  config: PredictWorldCupDataConfig;
}) => {
  const marketDataConfig = getWorldCupMarketDataConfig({
    tabKey,
    config,
    enabled: true,
  });

  if (!marketDataConfig.enabled) {
    return;
  }

  if (marketDataConfig.paginationEnabled) {
    queryClient.prefetchInfiniteQuery({
      queryKey: predictQueries.worldCup.keys.infiniteMarkets(
        marketDataConfig.tabKey,
        marketDataConfig.queryParams,
        marketDataConfig.pageSize,
      ),
      queryFn: ({ pageParam }) =>
        fetchInfiniteWorldCupMarketsPage({
          queryParams: marketDataConfig.queryParams,
          pageSize: marketDataConfig.pageSize,
          pageParam,
        }),
      staleTime: PREDICT_WORLD_CUP_MARKETS_STALE_TIME,
    });
    return;
  }

  queryClient.prefetchQuery(
    getSingleWorldCupMarketQueryOptions(marketDataConfig, config),
  );
};

export const usePredictWorldCupAvailability = (
  config: PredictWorldCupDataConfig,
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
  config: PredictWorldCupDataConfig,
  options: UsePredictWorldCupAvailableTabsOptions = DEFAULT_WORLD_CUP_MARKETS_OPTIONS,
) => {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const { availability, ...availabilityQuery } = usePredictWorldCupAvailability(
    config,
    options,
  );

  const availableTabKeys = useMemo(
    () => getPredictWorldCupAvailableTabKeys(config, availability),
    [availability, config],
  );

  const tabs = useMemo<PredictWorldCupAvailableTab[]>(
    () =>
      availableTabKeys.map((key) => {
        switch (key) {
          case PREDICT_WORLD_CUP_TAB_KEYS.ALL:
            return { key, label: strings('predict.world_cup.tabs.all') };
          case PREDICT_WORLD_CUP_TAB_KEYS.LIVE:
            return {
              key,
              label: strings('predict.world_cup.tabs.live'),
              isLive: true,
            };
          case PREDICT_WORLD_CUP_TAB_KEYS.PROPS:
            return { key, label: strings('predict.world_cup.tabs.props') };
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
      }),
    [availableTabKeys, config.stages],
  );

  const prefetchTabKeys = availableTabKeys.join(',');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    prefetchTabKeys
      .split(',')
      .filter(Boolean)
      .forEach((tabKey) =>
        prefetchWorldCupTabMarkets({ queryClient, tabKey, config }),
      );
  }, [config, enabled, prefetchTabKeys, queryClient]);

  return {
    ...availabilityQuery,
    availability,
    tabs,
  };
};
