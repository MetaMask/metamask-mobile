import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import TradeTabBar, { type TradeTab } from './TradeTabBar';
import {
  enterMoneySection,
  getContextualNavState,
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualMoneyTabBarProps {
  onHomePress: () => void;
  onHeightChange?: (height: number) => void;
  inline?: boolean;
  omitHome?: boolean;
}

type MoneyFooterTab = 'home' | 'account' | 'card' | 'earn';

const TABS: TradeTab<MoneyFooterTab>[] = [
  { id: 'home', label: strings('bottom_nav.home'), iconName: IconName.Home },
  { id: 'account', label: 'Account', iconName: IconName.UserCircle },
  { id: 'card', label: 'Card', iconName: IconName.Card },
  { id: 'earn', label: 'Earn', iconName: IconName.Gift },
];

const MONEY_TABS: readonly ContextualTab[] = ['account', 'card', 'earn'];

/**
 * Money footer. Account is the existing Money screen. Card and Earn open
 * their screens in place. Home returns to the default footer.
 */
const ContextualMoneyTabBar = ({
  onHomePress,
  onHeightChange,
  inline = false,
  omitHome = false,
}: ContextualMoneyTabBarProps) => {
  const { section, tab } = useContextualNavState();
  const activeTab: MoneyFooterTab =
    section === 'money' && MONEY_TABS.includes(tab) ? tab : 'account';

  const handleTabPress = useCallback(
    (nextTab: MoneyFooterTab) => {
      if (nextTab === 'home') {
        onHomePress();
        return;
      }
      if (getContextualNavState().section !== 'money') {
        enterMoneySection();
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
      onHeightChange={onHeightChange}
      testIDPrefix="contextual-money"
      inline={inline}
      itemsOnly={omitHome}
    />
  );
};

export default ContextualMoneyTabBar;
