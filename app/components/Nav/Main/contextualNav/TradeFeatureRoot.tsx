import React, { useEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';

import Routes from '../../../../constants/navigation/Routes';
import ContextualFooter from './ContextualFooter';
import {
  exitContextualSection,
  getContextualNavState,
  useContextualNavState,
  type TradingHubTab,
} from './contextualSection';

const PAGE_STYLE: ViewStyle = { flex: 1 };

const ROOT_BY_HUB: Record<TradingHubTab, string> = {
  swap: Routes.BRIDGE.ROOT,
  perps: Routes.PERPS.ROOT,
  predictions: Routes.PREDICT.ROOT,
};

export interface TradeFeatureRootProps {
  hub: TradingHubTab;
  children: React.ReactNode;
}

/**
 * Swap, Perps, or Predictions. The pill is part of this screen so it stays
 * above the pushed native page. Leaving the hub clears the section unless
 * another hub already took over.
 */
const TradeFeatureRoot = ({ hub, children }: TradeFeatureRootProps) => {
  const hubRef = useRef(hub);
  hubRef.current = hub;
  const { section, tab } = useContextualNavState();
  const showFooter = section === 'trading' && tab === hub;

  useEffect(
    () => () => {
      const current = getContextualNavState();
      if (current.section === 'trading' && current.tab === hubRef.current) {
        exitContextualSection();
      }
    },
    [],
  );

  if (!showFooter) {
    return <>{children}</>;
  }

  return (
    <View style={PAGE_STYLE}>
      <View style={PAGE_STYLE}>{children}</View>
      <ContextualFooter rootRouteName={ROOT_BY_HUB[hub]} />
    </View>
  );
};

export default TradeFeatureRoot;
