export const PREDICT_FEED_IDS = [
  'live-now',
  'popular-open',
  'tennis-open',
] as const;

export type PredictFeedId = (typeof PREDICT_FEED_IDS)[number];
export type PredictVenue = 'polymarket';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictFeedReference = {
  id: string;
  type: 'predict-feed';
  params: {
    venue: PredictVenue;
    feedId: PredictFeedId;
  };
};
