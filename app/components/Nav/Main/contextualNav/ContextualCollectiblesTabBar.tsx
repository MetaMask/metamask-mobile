import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import ContextualFloatingTabBar, {
  type ContextualFloatingTab,
} from './ContextualFloatingTabBar';
import {
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualCollectiblesTabBarProps {
  onHomePress: () => void;
}

const TABS: ContextualFloatingTab[] = [
  { id: 'popular', label: 'Popular', iconName: IconName.TrendUp },
  { id: 'packs', label: 'Packs', iconName: IconName.Copy },
  { id: 'collection', label: 'Collection', iconName: IconName.Card },
  { id: 'market', label: 'Market', iconName: IconName.Bank },
];

/**
 * Footer for Collectibles. Popular, Packs, Collection, and Market stay on
 * this page; only the selected item changes.
 */
const ContextualCollectiblesTabBar = ({
  onHomePress,
}: ContextualCollectiblesTabBarProps) => {
  const { tab } = useContextualNavState();

  const handleTabPress = useCallback((nextTab: ContextualTab) => {
    setContextualTab(nextTab);
  }, []);

  return (
    <ContextualFloatingTabBar
      tabs={TABS}
      activeTab={tab}
      onTabPress={handleTabPress}
      onHomePress={onHomePress}
      testIDPrefix="contextual-collectibles"
    />
  );
};

export default ContextualCollectiblesTabBar;
