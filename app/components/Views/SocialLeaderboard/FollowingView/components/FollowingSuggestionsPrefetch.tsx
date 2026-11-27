import React from 'react';
import { usePopularTraders } from '../../SocialV1View/feed/hooks/usePopularTraders';

/**
 * Starts the leaderboard request that Following suggestions read, while the
 * feed is still loading. Renders nothing. Mount it only while the prefetch is
 * allowed: `usePopularTraders` also starts the block-list queries, and the
 * Following tab is mounted when the app opens.
 */
const FollowingSuggestionsPrefetch: React.FC = () => {
  usePopularTraders();
  return null;
};

export default FollowingSuggestionsPrefetch;
