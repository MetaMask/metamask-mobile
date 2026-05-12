import type { PredictWorldCupConfig } from '../types/flags';

export const PREDICT_WORLD_CUP_FEED_PARAM = 'world-cup';

export const PREDICT_WORLD_CUP_TAB_KEYS = {
  ALL: 'all',
  LIVE: 'live',
  PROPS: 'props',
} as const;

export type PredictWorldCupFixedTabKey =
  (typeof PREDICT_WORLD_CUP_TAB_KEYS)[keyof typeof PREDICT_WORLD_CUP_TAB_KEYS];

export type PredictWorldCupTabKey = PredictWorldCupFixedTabKey | string;

const PREDICT_WORLD_CUP_FIXED_TAB_KEY_SET = new Set<string>(
  Object.values(PREDICT_WORLD_CUP_TAB_KEYS),
);

export const isPredictWorldCupFixedTabKey = (
  value?: string | null,
): value is PredictWorldCupFixedTabKey =>
  Boolean(value && PREDICT_WORLD_CUP_FIXED_TAB_KEY_SET.has(value));

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
