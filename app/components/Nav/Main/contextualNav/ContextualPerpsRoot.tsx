import React, { useCallback, useEffect, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Routes from '../../../../constants/navigation/Routes';
import PerpsScreenStack from '../../../UI/Perps/routes';
import LiveView from '../../../Views/SocialLeaderboard/LiveView/LiveView';
import ContextualPerpsTabBar from './ContextualPerpsTabBar';
import {
  exitContextualSection,
  getContextualNavState,
  useContextualNavState,
} from './contextualSection';

const COVER: ViewStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 1,
};

/**
 * Perps root screen. Entered from the + menu, the footer is part of this
 * screen, so the native push carries the home footer out and this footer in.
 * Home pops this screen, so the same card animation runs in reverse.
 */
const ContextualPerpsRoot = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [isSection] = useState(
    () => getContextualNavState().section === 'perps',
  );
  const { tab } = useContextualNavState();
  const handleHomePress = useCallback(() => {
    navigation.dispatch(
      StackActions.popTo(Routes.HOME_TABS, {
        screen: Routes.WALLET.HOME,
        params: { screen: Routes.WALLET_VIEW },
      }),
    );
  }, [navigation]);

  useEffect(() => {
    if (!isSection) {
      return undefined;
    }
    return () => {
      exitContextualSection();
    };
  }, [isSection]);

  if (!isSection) {
    return <PerpsScreenStack />;
  }

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <View style={tw.style('flex-1')}>
        <PerpsScreenStack />
      </View>
      {tab === 'live' ? (
        <View style={[COVER, tw.style('bg-default')]}>
          <LiveView />
        </View>
      ) : null}
      <ContextualPerpsTabBar onHomePress={handleHomePress} />
    </View>
  );
};

export default ContextualPerpsRoot;
