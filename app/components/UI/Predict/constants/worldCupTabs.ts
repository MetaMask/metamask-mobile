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

const normalizeStageTabKey = (key: string): string =>
  key.trim().toLowerCase().replace(/-/g, '_');

export const getPredictWorldCupAvailableTabKeys = (
  config?: Pick<PredictWorldCupConfig, 'stages'>,
  availability?: PredictWorldCupTabAvailability,
): string[] => {
  const keys: string[] = [PREDICT_WORLD_CUP_TAB_KEYS.ALL];

  if (!availability || availability.live) {
    keys.push(PREDICT_WORLD_CUP_TAB_KEYS.LIVE);
  }
  if (!availability || availability.props) {
    keys.push(PREDICT_WORLD_CUP_TAB_KEYS.PROPS);
  }

  const configuredStages = config?.stages ?? [];
  for (const stage of configuredStages) {
    if (!availability || availability.stages[stage.key] === true) {
      keys.push(stage.key);
    }
  }

  return keys;
};

export const resolvePredictWorldCupInitialTab = (
  requestedTab?: string | null,
  config?: Pick<PredictWorldCupConfig, 'stages'>,
  availability?: PredictWorldCupTabAvailability,
): PredictWorldCupTabKey => {
  const trimmed = requestedTab?.trim();
  if (!trimmed) {
    return PREDICT_WORLD_CUP_TAB_KEYS.ALL;
  }

  const normalizedTab = trimmed.toLowerCase();
  const availableTabKeys = getPredictWorldCupAvailableTabKeys(
    config,
    availability,
  );

  if (availableTabKeys.includes(normalizedTab)) {
    return normalizedTab;
  }

  const requestedNorm = normalizeStageTabKey(trimmed);
  const matched = availableTabKeys.find(
    (key) => normalizeStageTabKey(key) === requestedNorm,
  );

  return matched ?? PREDICT_WORLD_CUP_TAB_KEYS.ALL;
};
