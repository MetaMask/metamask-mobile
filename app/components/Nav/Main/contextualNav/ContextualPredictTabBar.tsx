import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import { usePredictSectionActions } from '../../../UI/PredictNext';
import ContextualFloatingTabBar, {
  type ContextualFloatingTab,
} from './ContextualFloatingTabBar';
import {
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualPredictTabBarProps {
  onHomePress: () => void;
}

const TABS: ContextualFloatingTab[] = [
  { id: 'explore', label: 'Explore', iconName: IconName.Explore },
  { id: 'live', label: 'Live', iconName: IconName.Activity },
  { id: 'search', label: 'Search', iconName: IconName.Search },
  { id: 'portfolio', label: 'Portfolio', iconName: IconName.Chart },
];

/**
 * Footer for Predictions. Same tabs as Perps: Explore, Live, Search,
 * Portfolio, and a home circle.
 */
const ContextualPredictTabBar = ({
  onHomePress,
}: ContextualPredictTabBarProps) => {
  const { tab } = useContextualNavState();
  const { openHome, openSearch, openLive, openPortfolio } =
    usePredictSectionActions();

  const handleTabPress = useCallback(
    (nextTab: ContextualTab) => {
      setContextualTab(nextTab);

      switch (nextTab) {
        case 'explore':
          openHome();
          break;
        case 'search':
          openSearch();
          break;
        case 'portfolio':
          openPortfolio();
          break;
        case 'live':
          openLive();
          break;
        default:
          break;
      }
    },
    [openHome, openLive, openPortfolio, openSearch],
  );

  return (
    <ContextualFloatingTabBar
      tabs={TABS}
      activeTab={tab}
      onTabPress={handleTabPress}
      onHomePress={onHomePress}
      testIDPrefix="contextual-predict"
    />
  );
};

export default ContextualPredictTabBar;
