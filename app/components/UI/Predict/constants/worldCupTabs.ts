import type { PredictWorldCupConfig } from '../types/flags';

export const PREDICT_WORLD_CUP_FEED_PARAM = 'world-cup';

export const PREDICT_WORLD_CUP_TAB_KEYS = {
  ALL: 'all',
  LIVE: 'live',
  PROPS: 'props',
} as const;

export type PredictWorldCupTabKey = string;

export const getPredictWorldCupAvailableTabKeys = (
  config?: Pick<PredictWorldCupConfig, 'stages'>,
): string[] => [
  ...Object.values(PREDICT_WORLD_CUP_TAB_KEYS),
  ...(config?.stages ?? []).map((stage) => stage.key),
];

export const resolvePredictWorldCupInitialTab = (
  requestedTab?: string | null,
  config?: Pick<PredictWorldCupConfig, 'stages'>,
): PredictWorldCupTabKey => {
  const normalizedTab = requestedTab?.toLowerCase();

  if (!normalizedTab) {
    return PREDICT_WORLD_CUP_TAB_KEYS.ALL;
  }

  const availableTabKeys = getPredictWorldCupAvailableTabKeys(config);

  return availableTabKeys.includes(normalizedTab)
    ? normalizedTab
    : PREDICT_WORLD_CUP_TAB_KEYS.ALL;
};
