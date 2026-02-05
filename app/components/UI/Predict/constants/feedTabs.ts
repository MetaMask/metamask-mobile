import type { PredictCategory } from '../types';

export type PredictFeedTabKey = PredictCategory;

export interface PredictFeedTabConfig {
  key: PredictFeedTabKey;
  labelKey: string;
}

export const PREDICT_FEED_DEFAULT_TAB: PredictFeedTabKey = 'trending';

export const PREDICT_FEED_BASE_TABS: readonly PredictFeedTabConfig[] = [
  { key: 'trending', labelKey: 'predict.category.trending' },
  { key: 'new', labelKey: 'predict.category.new' },
  { key: 'sports', labelKey: 'predict.category.sports' },
  { key: 'crypto', labelKey: 'predict.category.crypto' },
  { key: 'politics', labelKey: 'predict.category.politics' },
];

export const PREDICT_FEED_HOT_TAB: PredictFeedTabConfig = {
  key: 'hot',
  labelKey: 'predict.category.hot',
};

export const PREDICT_FEED_ALL_TABS: readonly PredictFeedTabConfig[] = [
  ...PREDICT_FEED_BASE_TABS,
  PREDICT_FEED_HOT_TAB,
];

const PREDICT_FEED_TAB_KEYS = PREDICT_FEED_ALL_TABS.map((tab) => tab.key);
const PREDICT_FEED_TAB_KEYS_SET = new Set<PredictFeedTabKey>(
  PREDICT_FEED_TAB_KEYS,
);

export const isPredictFeedTabKey = (
  value?: string | null,
): value is PredictFeedTabKey =>
  Boolean(value && PREDICT_FEED_TAB_KEYS_SET.has(value as PredictFeedTabKey));
