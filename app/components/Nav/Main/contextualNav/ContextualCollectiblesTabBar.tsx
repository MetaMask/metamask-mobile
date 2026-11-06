import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import ContextualHomeCircle from './ContextualHomeCircle';
import TradeTabBar, { type TradeTab } from './TradeTabBar';
import {
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualCollectiblesTabBarProps {
  onHomePress: () => void;
  inline?: boolean;
  /** Leave the Home circle to the shared shell. */
  itemsOnly?: boolean;
}

type CollectiblesFooterTab = 'popular' | 'packs' | 'collection' | 'market';

const TABS: TradeTab<CollectiblesFooterTab>[] = [
  { id: 'popular', label: 'Popular', iconName: IconName.TrendUp },
  { id: 'packs', label: 'Packs', iconName: IconName.Copy },
  { id: 'collection', label: 'Collection', iconName: IconName.Card },
  { id: 'market', label: 'Market', iconName: IconName.Bank },
];

const COLLECTIBLES_TABS = [
  'popular',
  'packs',
  'collection',
  'market',
] as const satisfies readonly CollectiblesFooterTab[];

const isCollectiblesFooterTab = (
  value: ContextualTab,
): value is CollectiblesFooterTab =>
  COLLECTIBLES_TABS.some((collectiblesTab) => collectiblesTab === value);

/**
 * Collectibles footer. Popular, Packs, Collection, and Market stay in the
 * pill. Home is the circle on the right and leaves the section.
 */
const ContextualCollectiblesTabBar = ({
  onHomePress,
  inline = false,
  itemsOnly = false,
}: ContextualCollectiblesTabBarProps) => {
  const { section, tab } = useContextualNavState();
  const activeTab: CollectiblesFooterTab =
    section === 'collectibles' && isCollectiblesFooterTab(tab)
      ? tab
      : 'popular';

  const handleTabPress = useCallback((nextTab: CollectiblesFooterTab) => {
    setContextualTab(nextTab);
  }, []);

  return (
    <TradeTabBar
      tabs={TABS}
      activeTab={activeTab}
      onTabPress={handleTabPress}
      testIDPrefix="contextual-collectibles"
      inline={inline}
      itemsOnly={itemsOnly}
      trailing={
        itemsOnly ? undefined : (
          <ContextualHomeCircle
            onPress={onHomePress}
            testID="contextual-collectibles-home-button"
          />
        )
      }
    />
  );
};

export default ContextualCollectiblesTabBar;
