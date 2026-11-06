import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import ContextualHomeCircle from './ContextualHomeCircle';
import TradeTabBar, { type TradeTab } from './TradeTabBar';
import type { TradingHubTab } from './contextualSection';

export type TradeFooterTab = 'explore' | TradingHubTab;

export interface TradeHubFooterProps {
  /** Explore on the landing page. A hub once one is open. */
  active: TradeFooterTab;
  onHomePress: () => void;
  onExplorePress: () => void;
  onHubPress: (hub: TradingHubTab) => void;
  inline?: boolean;
  /** Leave the Home circle to the shared shell. */
  itemsOnly?: boolean;
}

const TABS: TradeTab<TradeFooterTab>[] = [
  { id: 'explore', label: 'Explore', iconName: IconName.Explore },
  { id: 'swap', label: 'Swap', iconName: IconName.SwapVertical },
  { id: 'perps', label: 'Perps', iconName: IconName.Infinity },
  {
    id: 'predictions',
    label: 'Predictions',
    iconName: IconName.Predictions,
  },
];

/**
 * Trade footer. Explore, Swap, Perps, and Predictions. Explore is selected
 * on the landing page. Home is the circle on the right, unless the shared
 * shell is drawing that circle.
 */
const TradeHubFooter = ({
  active,
  onHomePress,
  onExplorePress,
  onHubPress,
  inline = false,
  itemsOnly = false,
}: TradeHubFooterProps) => {
  const handleTabPress = useCallback(
    (nextTab: TradeFooterTab) => {
      if (nextTab === 'explore') {
        if (active === 'explore') {
          return;
        }
        onExplorePress();
        return;
      }
      if (nextTab === active) {
        return;
      }
      onHubPress(nextTab);
    },
    [active, onExplorePress, onHubPress],
  );

  return (
    <TradeTabBar
      tabs={TABS}
      activeTab={active}
      onTabPress={handleTabPress}
      testIDPrefix="trade-hub"
      inline={inline}
      itemsOnly={itemsOnly}
      trailing={
        itemsOnly ? undefined : (
          <ContextualHomeCircle
            onPress={onHomePress}
            testID="trade-hub-home-button"
          />
        )
      }
    />
  );
};

export default TradeHubFooter;
