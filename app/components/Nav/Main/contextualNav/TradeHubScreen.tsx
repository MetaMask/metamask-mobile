import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Routes from '../../../../constants/navigation/Routes';
import ContextualSectionPlaceholder from './ContextualSectionPlaceholder';
import TradeHubFooter from './TradeHubFooter';
import {
  exitContextualSection,
  getContextualNavState,
  useContextualNavState,
  type TradingHubTab,
} from './contextualSection';
import { replaceTradingHub } from './tradeHubRoutes';
import { useTradingHubAvailability } from './useTradingHubAvailability';

const TITLE_BY_HUB: Record<TradingHubTab, string> = {
  swap: 'Swap',
  perps: 'Perps',
  predictions: 'Predictions',
};

/**
 * Stand-in hub used when Perps or Predictions is not registered. The footer
 * matches the real hubs.
 */
const TradeHubScreen = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const availability = useTradingHubAvailability();
  const leavingForHub = useRef(false);
  const { section, tab } = useContextualNavState();
  const active: TradingHubTab =
    section === 'trading' &&
    (tab === 'swap' || tab === 'perps' || tab === 'predictions')
      ? tab
      : 'swap';

  const handleHomePress = useCallback(() => {
    exitContextualSection();
    navigation.dispatch(
      StackActions.popTo(Routes.HOME_TABS, {
        screen: Routes.WALLET.HOME,
        params: { screen: Routes.WALLET_VIEW },
      }),
    );
  }, [navigation]);

  const handleHubPress = useCallback(
    (hub: TradingHubTab) => {
      leavingForHub.current = true;
      replaceTradingHub(hub, availability);
    },
    [availability],
  );

  useEffect(
    () => () => {
      if (leavingForHub.current) {
        return;
      }
      if (getContextualNavState().section === 'trading') {
        exitContextualSection();
      }
    },
    [],
  );

  return (
    <View style={tw.style('flex-1 bg-default')} testID="trade-hub-screen">
      <ContextualSectionPlaceholder title={TITLE_BY_HUB[active]} />
      <TradeHubFooter
        active={active}
        onHomePress={handleHomePress}
        onHubPress={handleHubPress}
      />
    </View>
  );
};

export default TradeHubScreen;
