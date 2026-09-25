import { useMemo } from 'react';
import { MOCK_SOCIAL_V1_FEED_ITEMS } from '../mocks/socialV1Feed.mock';
import type { UseSocialV1FeedResult } from '../types';

/**
 * Temporary V1 Feed data source until the social API exposes post/comment
 * fields. Matches the shape of a future live feed so the Feed tab can swap
 * implementations without changing card UI.
 */
export const useSocialV1Feed = (): UseSocialV1FeedResult =>
  useMemo(
    () => ({
      items: MOCK_SOCIAL_V1_FEED_ITEMS,
      isLoading: false,
      error: null,
    }),
    [],
  );
