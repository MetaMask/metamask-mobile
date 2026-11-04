import React, { useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';

import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import ContextualExploreTabBar from './ContextualExploreTabBar';
import ContextualHomeSectionOverlay from './ContextualHomeSectionOverlay';
import ContextualMoneyTabBar from './ContextualMoneyTabBar';
import {
  exitContextualSection,
  useContextualNavState,
} from './contextualSection';

/**
 * Footer shown over the native iOS tab bar. That bar cannot change its items,
 * so Money and Explore hide it and this chrome draws their pill instead.
 */
const ContextualNativeHomeChrome = () => {
  const { section } = useContextualNavState();

  const handleHomePress = useCallback(() => {
    exitContextualSection();
    NavigationService.navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.WALLET.HOME,
      params: { screen: Routes.WALLET_VIEW },
    });
  }, []);

  if (section !== 'money' && section !== 'explore') {
    return null;
  }

  return (
    <Box
      twClassName="absolute bottom-0 left-0 right-0 top-0"
      pointerEvents="box-none"
      testID="contextual-native-home-chrome"
    >
      <ContextualHomeSectionOverlay />
      {section === 'money' ? (
        <ContextualMoneyTabBar onHomePress={handleHomePress} />
      ) : (
        <ContextualExploreTabBar onHomePress={handleHomePress} />
      )}
    </Box>
  );
};

export default ContextualNativeHomeChrome;
