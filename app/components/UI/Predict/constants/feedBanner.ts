export const PredictFeedBannerPosition = {
  AfterBalance: 'after-balance',
  AfterFeaturedCarousel: 'after-featured-carousel',
  AfterWorldCupBanner: 'after-world-cup-banner',
  BeforePortfolio: 'before-portfolio',
  AfterPortfolio: 'after-portfolio',
  AfterLiveNow: 'after-live-now',
  AfterCategories: 'after-categories',
  AfterPopularToday: 'after-popular-today',
  AfterTrending: 'after-trending',
} as const;

export type PredictFeedBannerPosition =
  (typeof PredictFeedBannerPosition)[keyof typeof PredictFeedBannerPosition];

export const PredictFeedBannerSeverity = {
  Neutral: 'neutral',
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Danger: 'danger',
} as const;

export type PredictFeedBannerSeverity =
  (typeof PredictFeedBannerSeverity)[keyof typeof PredictFeedBannerSeverity];
