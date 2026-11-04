import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import TradeTabBar, { type TradeTab } from './TradeTabBar';
import type { TradingHubTab } from './contextualSection';

export type TradeFooterTab = 'home' | TradingHubTab | 'collectibles';

export interface TradeHubFooterProps {
  /** `null` on the Trade dashboard: no hub is selected, and neither is Home. */
  active: TradingHubTab | null;
  onHomePress: () => void;
  onHubPress: (hub: TradingHubTab) => void;
  onCollectiblesPress: () => void;
  inline?: boolean;
  /** Leave Home to the shared shell so it stays put during the morph. */
  omitHome?: boolean;
}

const TABS: TradeTab<TradeFooterTab>[] = [
  { id: 'home', label: strings('bottom_nav.home'), iconName: IconName.Home },
  { id: 'swap', label: 'Swap', iconName: IconName.SwapVertical },
  { id: 'perps', label: 'Perps', iconName: IconName.Infinity },
  {
    id: 'predictions',
    label: 'Predictions',
    iconName: IconName.Predictions,
  },
  { id: 'collectibles', label: 'Collectibles', iconName: IconName.Card },
];

/**
 * Trade footer. Home, Swap, Perps, Predictions, and Collectibles. The open
 * hub is selected. The dashboard leaves every item unselected.
 */
const TradeHubFooter = ({
  active,
  onHomePress,
  onHubPress,
  onCollectiblesPress,
  inline = false,
  omitHome = false,
}: TradeHubFooterProps) => {
  const handleTabPress = useCallback(
    (nextTab: TradeFooterTab) => {
      if (nextTab === 'home') {
        onHomePress();
        return;
      }
      if (nextTab === 'collectibles') {
        onCollectiblesPress();
        return;
      }
      if (nextTab === active) {
        return;
      }
      onHubPress(nextTab);
    },
    [active, onCollectiblesPress, onHomePress, onHubPress],
  );

  const tabs = omitHome ? TABS.filter((item) => item.id !== 'home') : TABS;

  return (
    <TradeTabBar
      tabs={tabs}
      activeTab={active}
      onTabPress={handleTabPress}
      testIDPrefix="trade-hub"
      inline={inline}
      itemsOnly={omitHome}
    />
  );
};

export default TradeHubFooter;
