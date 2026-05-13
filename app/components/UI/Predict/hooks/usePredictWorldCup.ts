import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import {
  getPredictWorldCupAvailableTabKeys,
  PREDICT_WORLD_CUP_TAB_KEYS,
  type PredictWorldCupTabAvailability,
  type PredictWorldCupTabKey,
} from '../constants/worldCupTabs';
import {
  buildPredictWorldCupAllQuery,
  buildPredictWorldCupPropsQuery,
  resolvePredictWorldCupStageLabel,
} from '../utils/worldCup';
import { usePredictMarketData } from './usePredictMarketData';
import type {
  PredictWorldCupConfig,
  PredictWorldCupStageConfig,
} from '../types/flags';

export interface UsePredictWorldCupMarketsOptions {
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

const DEFAULT_WORLD_CUP_MARKETS_OPTIONS = {
  enabled: true,
} as const;

export const usePredictWorldCupAllMarkets = (
  config: Pick<PredictWorldCupConfig, 'tagSlug'>,
  options: UsePredictWorldCupMarketsOptions = DEFAULT_WORLD_CUP_MARKETS_OPTIONS,
) =>
  usePredictMarketData({
    category: 'hot',
    customQueryParams: buildPredictWorldCupAllQuery(config),
    pageSize: options.pageSize,
    enabled: options.enabled,
  });

export const usePredictWorldCupPropsMarkets = (
  config: Pick<PredictWorldCupConfig, 'tagSlug' | 'gamesTagId'>,
  options: UsePredictWorldCupMarketsOptions = DEFAULT_WORLD_CUP_MARKETS_OPTIONS,
) =>
  usePredictMarketData({
    category: 'hot',
    customQueryParams: buildPredictWorldCupPropsQuery(config),
    pageSize: options.pageSize,
    enabled: options.enabled,
  });

export const usePredictWorldCupLiveMarkets = (
  config: Pick<PredictWorldCupConfig, 'seriesId' | 'gamesTagId'>,
  options: UsePredictWorldCupMarketsOptions = DEFAULT_WORLD_CUP_MARKETS_OPTIONS,
) =>
  useQuery({
    ...predictQueries.worldCup.options.live(config, {
      limit: options.pageSize,
    }),
    enabled: options.enabled,
  });

export const usePredictWorldCupStageMarkets = (
  stage: Pick<PredictWorldCupStageConfig, 'key' | 'eventIds'>,
  options: Pick<
    UsePredictWorldCupMarketsOptions,
    'enabled'
  > = DEFAULT_WORLD_CUP_MARKETS_OPTIONS,
) =>
  useQuery({
    ...predictQueries.worldCup.options.stage(stage),
    enabled: options.enabled,
  });

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
