import { queryOptions } from '@tanstack/react-query';
import {
  buildPredictWorldCupAllQuery,
  buildPredictWorldCupLiveQuery,
  buildPredictWorldCupPropsQuery,
  buildPredictWorldCupStageEventsQuery,
} from '../utils/worldCup';
import {
  fetchPredictWorldCupAvailability,
  fetchPredictWorldCupMarkets,
  PREDICT_WORLD_CUP_PAGE_SIZE,
} from '../services/worldCup';
import type { PredictMarket } from '../types';
import type {
  PredictWorldCupConfig,
  PredictWorldCupStageConfig,
} from '../types/flags';

export interface PredictWorldCupPageOptions {
  limit?: number;
}

export const predictWorldCupKeys = {
  all: () => ['predict', 'worldCup'] as const,
  markets: (tabKey: string, queryParams: string, limit: number) =>
    [
      ...predictWorldCupKeys.all(),
      'markets',
      tabKey,
      queryParams,
      limit,
    ] as const,
  infiniteMarkets: (tabKey: string, queryParams: string, limit: number) =>
    [
      ...predictWorldCupKeys.all(),
      'markets',
      'infinite',
      tabKey,
      queryParams,
      limit,
    ] as const,
  tab: (queryParams: string) =>
    [...predictWorldCupKeys.all(), 'tab', queryParams] as const,
  availability: (tabKey: string, queryParams: string) =>
    [
      ...predictWorldCupKeys.all(),
      'availability',
      tabKey,
      queryParams,
    ] as const,
  stage: (stageKey: string, eventIds: string[]) =>
    [...predictWorldCupKeys.all(), 'stage', stageKey, ...eventIds] as const,
};

export const predictWorldCupQueryParams = {
  all: (config: Pick<PredictWorldCupConfig, 'tagSlug'>) =>
    buildPredictWorldCupAllQuery(config),
  props: (config: Pick<PredictWorldCupConfig, 'tagSlug' | 'gamesTagId'>) =>
    buildPredictWorldCupPropsQuery(config),
  live: (config: Pick<PredictWorldCupConfig, 'seriesId' | 'gamesTagId'>) =>
    buildPredictWorldCupLiveQuery(config),
  stage: (stage: Pick<PredictWorldCupStageConfig, 'eventIds'>) =>
    buildPredictWorldCupStageEventsQuery(stage),
};

const getPageOptions = ({
  limit = PREDICT_WORLD_CUP_PAGE_SIZE,
}: PredictWorldCupPageOptions = {}) => ({ limit });

const buildMarketsOptions = ({
  tabKey,
  queryParams,
  limit,
  sortByStartTime = false,
}: {
  tabKey: string;
  queryParams: string;
  limit: number;
  sortByStartTime?: boolean;
}) =>
  queryOptions<PredictMarket[], Error>({
    queryKey: predictWorldCupKeys.markets(tabKey, queryParams, limit),
    queryFn: () =>
      fetchPredictWorldCupMarkets({
        queryParams,
        limit,
        sortByStartTime,
      }),
    staleTime: 10_000,
  });

const buildAvailabilityOptions = ({
  tabKey,
  queryParams,
}: {
  tabKey: string;
  queryParams: string;
}) =>
  queryOptions<boolean, Error>({
    queryKey: predictWorldCupKeys.availability(tabKey, queryParams),
    queryFn: () => fetchPredictWorldCupAvailability(queryParams),
    staleTime: 10_000,
  });

export const predictWorldCupOptions = {
  all: (
    config: Pick<PredictWorldCupConfig, 'tagSlug'>,
    pageOptions?: PredictWorldCupPageOptions,
  ) => {
    const { limit } = getPageOptions(pageOptions);
    return buildMarketsOptions({
      tabKey: 'all',
      queryParams: predictWorldCupQueryParams.all(config),
      limit,
    });
  },
  props: (
    config: Pick<PredictWorldCupConfig, 'tagSlug' | 'gamesTagId'>,
    pageOptions?: PredictWorldCupPageOptions,
  ) => {
    const { limit } = getPageOptions(pageOptions);
    return buildMarketsOptions({
      tabKey: 'props',
      queryParams: predictWorldCupQueryParams.props(config),
      limit,
    });
  },
  live: (
    config: Pick<PredictWorldCupConfig, 'seriesId' | 'gamesTagId'>,
    pageOptions?: PredictWorldCupPageOptions,
  ) => {
    const { limit } = getPageOptions(pageOptions);
    return buildMarketsOptions({
      tabKey: 'live',
      queryParams: predictWorldCupQueryParams.live(config),
      limit,
    });
  },
  stage: (stage: Pick<PredictWorldCupStageConfig, 'key' | 'eventIds'>) => {
    const queryParams = predictWorldCupQueryParams.stage(stage);
    const limit = stage.eventIds.length;

    return queryOptions<PredictMarket[], Error>({
      queryKey: predictWorldCupKeys.stage(stage.key, stage.eventIds),
      queryFn: () =>
        limit === 0
          ? []
          : fetchPredictWorldCupMarkets({
              queryParams,
              limit,
            }),
      staleTime: 10_000,
    });
  },
  availability: {
    live: (config: Pick<PredictWorldCupConfig, 'seriesId' | 'gamesTagId'>) =>
      buildAvailabilityOptions({
        tabKey: 'live',
        queryParams: predictWorldCupQueryParams.live(config),
      }),
    props: (config: Pick<PredictWorldCupConfig, 'tagSlug' | 'gamesTagId'>) =>
      buildAvailabilityOptions({
        tabKey: 'props',
        queryParams: predictWorldCupQueryParams.props(config),
      }),
    stage: (stage: Pick<PredictWorldCupStageConfig, 'key' | 'eventIds'>) => {
      const queryParams = predictWorldCupQueryParams.stage(stage);

      return queryOptions<boolean, Error>({
        queryKey: predictWorldCupKeys.availability(stage.key, queryParams),
        queryFn: () =>
          stage.eventIds.length === 0
            ? false
            : fetchPredictWorldCupAvailability(queryParams),
        staleTime: 10_000,
      });
    },
  },
};
