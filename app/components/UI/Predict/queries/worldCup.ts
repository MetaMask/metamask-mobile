import {
  buildPredictWorldCupAllQuery,
  buildPredictWorldCupLiveQuery,
  buildPredictWorldCupPropsQuery,
  buildPredictWorldCupStageEventsQuery,
} from '../utils/worldCup';
import type {
  PredictWorldCupConfig,
  PredictWorldCupStageConfig,
} from '../types/flags';

export const predictWorldCupKeys = {
  all: () => ['predict', 'worldCup'] as const,
  tab: (queryParams: string) =>
    [...predictWorldCupKeys.all(), 'tab', queryParams] as const,
  stage: (stageKey: string, eventIds: string[]) =>
    [...predictWorldCupKeys.all(), 'stage', stageKey, ...eventIds] as const,
};

export const predictWorldCupOptions = {
  all: (config: Pick<PredictWorldCupConfig, 'tagSlug'>) =>
    buildPredictWorldCupAllQuery(config),
  props: (config: Pick<PredictWorldCupConfig, 'tagSlug' | 'gamesTagId'>) =>
    buildPredictWorldCupPropsQuery(config),
  live: (config: Pick<PredictWorldCupConfig, 'seriesId' | 'gamesTagId'>) =>
    buildPredictWorldCupLiveQuery(config),
  stage: (stage: Pick<PredictWorldCupStageConfig, 'eventIds'>) =>
    buildPredictWorldCupStageEventsQuery(stage),
};
