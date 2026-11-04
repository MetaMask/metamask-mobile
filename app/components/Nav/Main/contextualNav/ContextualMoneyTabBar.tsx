import React, { useCallback } from 'react';
import { IconName } from '@metamask/design-system-react-native';

import ContextualFloatingTabBar, {
  type ContextualFloatingTab,
} from './ContextualFloatingTabBar';
import {
  enterMoneySection,
  getContextualNavState,
  setContextualTab,
  useContextualNavState,
  type ContextualTab,
} from './contextualSection';

export interface ContextualMoneyTabBarProps {
  onHomePress: () => void;
  fadeIn?: boolean;
  onHeightChange?: (height: number) => void;
}

const TABS: ContextualFloatingTab[] = [
  { id: 'account', label: 'Account', iconName: IconName.UserCircle },
  { id: 'payments', label: 'Payments', iconName: IconName.Cash },
];

const MONEY_TABS: readonly ContextualTab[] = ['account', 'payments'];

/**
 * Money footer. Account and Payments sit in the pill. Home returns to the
 * wallet footer.
 */
const ContextualMoneyTabBar = ({
  onHomePress,
  fadeIn = false,
  onHeightChange,
}: ContextualMoneyTabBarProps) => {
  const { section, tab } = useContextualNavState();
  const activeTab =
    section === 'money' && MONEY_TABS.includes(tab) ? tab : 'account';

  const ensureMoneySection = useCallback(() => {
    if (getContextualNavState().section !== 'money') {
      enterMoneySection();
    }
  }, []);

  const handleTabPress = useCallback(
    (nextTab: ContextualTab) => {
      ensureMoneySection();
      setContextualTab(nextTab);
    },
    [ensureMoneySection],
  );

  return (
    <ContextualFloatingTabBar
      tabs={TABS}
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onHomePress={onHomePress}
      fadeIn={fadeIn}
      onHeightChange={onHeightChange}
      testIDPrefix="contextual-money"
    />
  );
};

export default ContextualMoneyTabBar;
