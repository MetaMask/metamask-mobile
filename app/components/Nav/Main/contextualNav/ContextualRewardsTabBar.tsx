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

export interface ContextualRewardsTabBarProps {
  onHomePress: () => void;
}

const TABS: ContextualFloatingTab[] = [
  { id: 'earn', label: 'Earn', iconName: IconName.Gift },
  { id: 'claim', label: 'Claim', iconName: IconName.Coin },
  { id: 'performance', label: 'Performance', iconName: IconName.Chart },
];

/**
 * Footer for Rewards. Earn, Claim, and Performance are the money rewards pages.
 */
const ContextualRewardsTabBar = ({
  onHomePress,
}: ContextualRewardsTabBarProps) => {
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
      testIDPrefix="contextual-rewards"
    />
  );
};

export default ContextualRewardsTabBar;
