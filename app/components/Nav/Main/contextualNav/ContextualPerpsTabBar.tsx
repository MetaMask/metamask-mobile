import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ReduxService from '../../../../core/redux';
import {
  getPerpsHomeNavigationTarget,
  toPerpsNavigatorScreenParams,
} from '../../../UI/Perps/utils/perpsModeSwitch';
import ContextualFloatingTabBar, {
  type ContextualFloatingTab,
} from './ContextualFloatingTabBar';
import {
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualPerpsTabBarProps {
  onHomePress: () => void;
}

const TABS: ContextualFloatingTab[] = [
  { id: 'explore', label: 'Explore', iconName: IconName.Explore },
  { id: 'live', label: 'Live', iconName: IconName.Activity },
  { id: 'search', label: 'Search', iconName: IconName.Search },
  { id: 'portfolio', label: 'Portfolio', iconName: IconName.Chart },
];

/**
 * Footer for the Perps section.
 */
const ContextualPerpsTabBar = ({ onHomePress }: ContextualPerpsTabBarProps) => {
  const { tab } = useContextualNavState();

  const openPerpsHome = useCallback(() => {
    const target = getPerpsHomeNavigationTarget(ReduxService.store.getState());
    NavigationService.navigation.navigate(
      Routes.PERPS.ROOT,
      toPerpsNavigatorScreenParams(target, { pop: true }),
    );
  }, []);

  const openMarketsSearch = useCallback(() => {
    NavigationService.navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_LIST,
      params: {
        defaultMarketTypeFilter: 'all',
        fromHome: true,
      },
      pop: true,
    });
  }, []);

  const handleTabPress = useCallback(
    (nextTab: ContextualTab) => {
      setContextualTab(nextTab);

      switch (nextTab) {
        case 'explore':
          openPerpsHome();
          break;
        case 'search':
          openMarketsSearch();
          break;
        case 'live':
        case 'portfolio':
          break;
        default:
          break;
      }
    },
    [openMarketsSearch, openPerpsHome],
  );

  return (
    <ContextualFloatingTabBar
      tabs={TABS}
      activeTab={tab}
      onTabPress={handleTabPress}
      onHomePress={onHomePress}
      testIDPrefix="contextual-perps"
    />
  );
};

export default ContextualPerpsTabBar;
