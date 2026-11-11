export const PredictFeedScreenTestIds = {
  VIEW: 'predict-next-feed-screen',
  HEADER: 'predict-next-feed-screen-header',
  BACK: 'predict-next-feed-screen-back',
  UNAVAILABLE: 'predict-next-feed-screen-unavailable',
  TABS: 'predict-next-feed-screen-tabs',
  tab: (tabId: string) => `predict-next-feed-screen-tab-${tabId}`,
  LIST: 'predict-next-feed-screen-list',
  LOADING: 'predict-next-feed-screen-loading',
  ERROR: 'predict-next-feed-screen-error',
  RETRY: 'predict-next-feed-screen-retry',
  EMPTY: 'predict-next-feed-screen-empty',
  NEXT_PAGE_LOADING: 'predict-next-feed-screen-next-page-loading',
} as const;
