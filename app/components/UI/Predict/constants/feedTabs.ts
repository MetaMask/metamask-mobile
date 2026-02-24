import type { PredictCategory } from '../types';

export type PredictTabKey = PredictCategory;

export interface PredictTabConfig {
  key: PredictTabKey;
  labelKey: string;
}

export const PREDICT_BASE_TABS: readonly PredictTabConfig[] = [
  { key: 'trending', labelKey: 'predict.category.trending' },
  { key: 'ending-soon', labelKey: 'predict.category.ending_soon' },
  { key: 'new', labelKey: 'predict.category.new' },
  { key: 'sports', labelKey: 'predict.category.sports' },
  { key: 'crypto', labelKey: 'predict.category.crypto' },
  { key: 'politics', labelKey: 'predict.category.politics' },
];

export const PREDICT_HOT_TAB: PredictTabConfig = {
  key: 'hot',
  labelKey: 'predict.category.hot',
};

export const PREDICT_ALL_TABS: readonly PredictTabConfig[] = [
  ...PREDICT_BASE_TABS,
  PREDICT_HOT_TAB,
];

const PREDICT_TAB_KEYS = PREDICT_ALL_TABS.map((tab) => tab.key);
const PREDICT_TAB_KEYS_SET = new Set<PredictTabKey>(PREDICT_TAB_KEYS);

export const isPredictTabKey = (
  value?: string | null,
): value is PredictTabKey =>
  Boolean(value && PREDICT_TAB_KEYS_SET.has(value as PredictTabKey));
