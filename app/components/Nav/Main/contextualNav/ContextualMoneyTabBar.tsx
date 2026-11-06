import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import ContextualHomeCircle from './ContextualHomeCircle';
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
  /** Leave the Home circle to the shared shell. */
  itemsOnly?: boolean;
}

type MoneyFooterTab = 'account' | 'card' | 'earn';

const TABS: TradeTab<MoneyFooterTab>[] = [
  { id: 'account', label: 'Account', iconName: IconName.UserCircle },
  { id: 'card', label: 'Card', iconName: IconName.Card },
  { id: 'earn', label: 'Earn', iconName: IconName.Gift },
];

const MONEY_TABS = [
  'account',
  'card',
  'earn',
] as const satisfies readonly MoneyFooterTab[];

const isMoneyFooterTab = (value: ContextualTab): value is MoneyFooterTab =>
  MONEY_TABS.some((moneyTab) => moneyTab === value);

/**
 * Money footer. Account is the existing Money screen. Card and Earn open
 * their screens in place. Home is the circle on the right.
 */
const ContextualMoneyTabBar = ({
  onHomePress,
  onHeightChange,
  inline = false,
  itemsOnly = false,
}: ContextualMoneyTabBarProps) => {
  const { section, tab } = useContextualNavState();
  const activeTab: MoneyFooterTab =
    section === 'money' && isMoneyFooterTab(tab) ? tab : 'account';

  const handleTabPress = useCallback((nextTab: MoneyFooterTab) => {
    if (getContextualNavState().section !== 'money') {
      enterMoneySection();
    }
    setContextualTab(nextTab);
  }, []);

  return (
    <TradeTabBar
      tabs={TABS}
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onHeightChange={onHeightChange}
      testIDPrefix="contextual-money"
      inline={inline}
      itemsOnly={itemsOnly}
      trailing={
        itemsOnly ? undefined : (
          <ContextualHomeCircle
            onPress={onHomePress}
            testID="contextual-money-home-button"
          />
        )
      }
    />
  );
};

export default ContextualMoneyTabBar;
