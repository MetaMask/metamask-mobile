import React from 'react';
import { useSelector } from 'react-redux';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import type { SocialFeedProps } from './SocialFeed.types';
import SocialFeedContent from './SocialFeedContent';
import SocialFeedVirtualized from './SocialFeedVirtualized';

export type {
  SocialFeedInlineRow,
  SocialFeedProps,
  SocialFeedScrollMode,
} from './SocialFeed.types';
export {
  SOCIAL_FEED_NEXT_PAGE_TEST_ID,
  SOCIAL_FEED_SENTINEL_TEST_ID,
} from './SocialFeedStates.testIds';

/**
 * Infinite social feed for one source, hidden while the social flag is off.
 *
 * `scrollMode="content"` (default) renders inside the host's scroll, for
 * embeds such as Perps and Token details. `scrollMode="virtualized"` owns a
 * list for full-screen tabs and is the only mode that streams realtime posts.
 */
const SocialFeed: React.FC<SocialFeedProps> = (props) => {
  const enabled = useSelector(selectSocialLeaderboardEnabled);
  if (!enabled) {
    return null;
  }
  return props.scrollMode === 'virtualized' ? (
    <SocialFeedVirtualized {...props} />
  ) : (
    <SocialFeedContent {...props} />
  );
};

export default SocialFeed;
