import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import TradeTabBar, { type TradeTab } from './TradeTabBar';
import {
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualCollectiblesTabBarProps {
  onHomePress: () => void;
  inline?: boolean;
  omitHome?: boolean;
}

type CollectiblesFooterTab =
  | 'home'
  | 'popular'
  | 'packs'
  | 'collection'
  | 'market';

const TABS: TradeTab<CollectiblesFooterTab>[] = [
  { id: 'home', label: strings('bottom_nav.home'), iconName: IconName.Home },
  { id: 'popular', label: 'Popular', iconName: IconName.TrendUp },
  { id: 'packs', label: 'Packs', iconName: IconName.Copy },
  { id: 'collection', label: 'Collection', iconName: IconName.Card },
  { id: 'market', label: 'Market', iconName: IconName.Bank },
];

const COLLECTIBLES_TABS: readonly ContextualTab[] = [
  'popular',
  'packs',
  'collection',
  'market',
];

/**
 * Collectibles footer. Popular, Packs, Collection, and Market stay. Home is
 * the first tab and leaves the section.
 */
const ContextualCollectiblesTabBar = ({
  onHomePress,
  inline = false,
  omitHome = false,
}: ContextualCollectiblesTabBarProps) => {
  const { section, tab } = useContextualNavState();
  const activeTab: CollectiblesFooterTab =
    section === 'collectibles' && COLLECTIBLES_TABS.includes(tab)
      ? tab
      : 'popular';

  const handleTabPress = useCallback(
    (nextTab: CollectiblesFooterTab) => {
      if (nextTab === 'home') {
        onHomePress();
        return;
      }
      setContextualTab(nextTab);
    },
    [onHomePress],
  );

  return (
    <TradeTabBar
      tabs={omitHome ? TABS.filter((item) => item.id !== 'home') : TABS}
      activeTab={activeTab}
      onTabPress={handleTabPress}
      testIDPrefix="contextual-collectibles"
      inline={inline}
      itemsOnly={omitHome}
    />
  );
};

export default ContextualCollectiblesTabBar;
