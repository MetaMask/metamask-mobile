import React from 'react';
import { useSelector } from 'react-redux';
import { selectSocialFeedEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import SocialTradersTabsView from './SocialTradersTabsView';
import TopTradersView from './TopTradersView';

/**
 * Route entry for the Follow Trading surface.
 *
 * When the `aiSocialFeedEnabled` flag is on, renders the Leaderboard | Feed
 * tabbed container. Otherwise renders the existing standalone leaderboard,
 * leaving current behavior unchanged.
 */
const SocialTradersView: React.FC = () => {
  const isFeedEnabled = useSelector(selectSocialFeedEnabled);

  return isFeedEnabled ? <SocialTradersTabsView /> : <TopTradersView />;
};

export default SocialTradersView;
