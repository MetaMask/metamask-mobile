import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Routes from '../../../../constants/navigation/Routes';
import TradeHubFooter from './TradeHubFooter';
import {
  exitContextualSection,
  getContextualNavState,
  useContextualNavState,
  type TradingHubTab,
} from './contextualSection';
import { replaceTradingHub } from './tradeHubRoutes';
import { useTradingHubAvailability } from './useTradingHubAvailability';

export interface TradeFeatureRootProps {
  hub: TradingHubTab;
  children: React.ReactNode;
}

/**
 * Real Swap, Perps, or Predictions screen with the trading footer when this
 * hub was opened from Trade. Other entries leave the section unset and keep
 * the screen's own navigation.
 */
const TradeFeatureRoot = ({ hub, children }: TradeFeatureRootProps) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const availability = useTradingHubAvailability();
  const leavingForHub = useRef(false);
  const { section, tab } = useContextualNavState();
  const showFooter = section === 'trading' && tab === hub;

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
    (nextHub: TradingHubTab) => {
      leavingForHub.current = true;
      replaceTradingHub(nextHub, availability);
    },
    [availability],
  );

  useEffect(
    () => () => {
      if (leavingForHub.current) {
        return;
      }
      const current = getContextualNavState();
      if (current.section === 'trading' && current.tab === hub) {
        exitContextualSection();
      }
    },
    [hub],
  );

  if (!showFooter) {
    return <>{children}</>;
  }

  return (
    <View style={tw.style('flex-1 bg-default')} testID={`trade-feature-${hub}`}>
      <View style={tw.style('flex-1')}>{children}</View>
      <TradeHubFooter
        active={hub}
        onHomePress={handleHomePress}
        onHubPress={handleHubPress}
      />
    </View>
  );
};

export default TradeFeatureRoot;
