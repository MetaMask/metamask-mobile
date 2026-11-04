import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import TradeTabBar, { type TradeTab } from './TradeTabBar';
import type { TradingHubTab } from './contextualSection';

export interface TradeHubFooterProps {
  active: TradingHubTab;
  onHomePress: () => void;
  onHubPress: (hub: TradingHubTab) => void;
}

type HubFooterTab = 'home' | TradingHubTab;

const TABS: TradeTab<HubFooterTab>[] = [
  { id: 'home', label: strings('bottom_nav.home'), iconName: IconName.Home },
  { id: 'swap', label: 'Swap', iconName: IconName.SwapVertical },
  { id: 'perps', label: 'Perps', iconName: IconName.Infinity },
  {
    id: 'predictions',
    label: 'Predictions',
    iconName: IconName.Predictions,
  },
];

/**
 * Footer inside Swap, Perps, or Predictions. The other ways to trade, with
 * the current one selected. Home is the first tab and leaves the hub.
 */
const TradeHubFooter = ({
  active,
  onHomePress,
  onHubPress,
}: TradeHubFooterProps) => {
  const handleTabPress = useCallback(
    (nextTab: HubFooterTab) => {
      if (nextTab === 'home') {
        onHomePress();
        return;
      }
      if (nextTab === active) {
        return;
      }
      onHubPress(nextTab);
    },
    [active, onHomePress, onHubPress],
  );

  return (
    <TradeTabBar
      tabs={TABS}
      activeTab={active}
      onTabPress={handleTabPress}
      testIDPrefix="trade-hub"
    />
  );
};

export default TradeHubFooter;
