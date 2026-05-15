import type { PredictWorldCupConfig } from '../types/flags';

export const PREDICT_WORLD_CUP_FEED_PARAM = 'world-cup';

export const PREDICT_WORLD_CUP_TAB_KEYS = {
  ALL: 'all',
  LIVE: 'live',
  PROPS: 'props',
} as const;

export type PredictWorldCupTabKey = string;

export interface PredictWorldCupTabAvailability {
  live: boolean;
  props: boolean;
  stages: Record<string, boolean>;
}

export const getPredictWorldCupAvailableTabKeys = (
  config?: Pick<PredictWorldCupConfig, 'stages'>,
  availability?: PredictWorldCupTabAvailability,
): string[] => [
  PREDICT_WORLD_CUP_TAB_KEYS.ALL,
  ...(!availability || availability.live
    ? [PREDICT_WORLD_CUP_TAB_KEYS.LIVE]
    : []),
  ...(!availability || availability.props
    ? [PREDICT_WORLD_CUP_TAB_KEYS.PROPS]
    : []),
  ...(config?.stages ?? [])
    .filter((stage) => !availability || availability.stages[stage.key])
    .map((stage) => stage.key),
];

export const resolvePredictWorldCupInitialTab = (
  requestedTab?: string | null,
  config?: Pick<PredictWorldCupConfig, 'stages'>,
  availability?: PredictWorldCupTabAvailability,
): PredictWorldCupTabKey => {
  const normalizedTab = requestedTab?.toLowerCase();

  if (!normalizedTab) {
    return PREDICT_WORLD_CUP_TAB_KEYS.ALL;
  }

  const availableTabKeys = getPredictWorldCupAvailableTabKeys(
    config,
    availability,
  );

  return availableTabKeys.includes(normalizedTab)
    ? normalizedTab
    : PREDICT_WORLD_CUP_TAB_KEYS.ALL;
};
