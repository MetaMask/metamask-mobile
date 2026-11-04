import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import ContextualFloatingTabBar, {
  type ContextualFloatingTab,
} from './ContextualFloatingTabBar';
import {
  enterExploreSection,
  getContextualNavState,
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualExploreTabBarProps {
  onHomePress: () => void;
  fadeIn?: boolean;
  onHeightChange?: (height: number) => void;
}

const TABS: ContextualFloatingTab[] = [
  { id: 'explore', label: 'Explore', iconName: IconName.Explore },
  { id: 'news', label: 'News', iconName: IconName.FeedPost },
  { id: 'browser', label: 'Browser', iconName: IconName.Global },
  { id: 'search', label: 'Search', iconName: IconName.Search },
];

const EXPLORE_TABS: readonly ContextualTab[] = [
  'explore',
  'news',
  'browser',
  'search',
];

/**
 * Explore footer. Explore, News, Browser, and Search sit in the pill.
 * Home returns to the wallet footer.
 */
const ContextualExploreTabBar = ({
  onHomePress,
  fadeIn = false,
  onHeightChange,
}: ContextualExploreTabBarProps) => {
  const { section, tab } = useContextualNavState();
  const activeTab =
    section === 'explore' && EXPLORE_TABS.includes(tab) ? tab : 'explore';

  const ensureExploreSection = useCallback(() => {
    if (getContextualNavState().section !== 'explore') {
      enterExploreSection();
    }
  }, []);

  const handleTabPress = useCallback(
    (nextTab: ContextualTab) => {
      ensureExploreSection();
      setContextualTab(nextTab);
    },
    [ensureExploreSection],
  );

  return (
    <ContextualFloatingTabBar
      tabs={TABS}
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onHomePress={onHomePress}
      fadeIn={fadeIn}
      onHeightChange={onHeightChange}
      testIDPrefix="contextual-explore"
    />
  );
};

export default ContextualExploreTabBar;
