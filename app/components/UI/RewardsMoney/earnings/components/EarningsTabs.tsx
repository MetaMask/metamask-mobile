import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_MONEY_TEST_IDS } from '../../constants';

export const EARNINGS_TAB_LEDGER = 0;
export const EARNINGS_TAB_CODE_PERFORMANCE = 1;

interface EarningsTabsProps {
  activeIndex: number;
  onTabPress: (index: number) => void;
  /** Code-performance has no endpoint yet, so it is hidden for the referee. */
  showCodePerformance: boolean;
}

/**
 * The tab bar above the ledger.
 *
 * `TabsBar` rather than `TabsList`: `TabsList` owns its own swipeable scroll
 * container, which would nest inside — and break — the ledger's `FlatList`
 * infinite scroll. The bar is controlled and the parent swaps content.
 */
const EarningsTabs: React.FC<EarningsTabsProps> = ({
  activeIndex,
  onTabPress,
  showCodePerformance,
}) => {
  const tabs = useMemo<TabItem[]>(() => {
    const items: TabItem[] = [
      {
        key: 'ledger',
        label: strings('rewards_money.earnings.tab_activity'),
        content: null,
        testID: `${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-ledger`,
      },
    ];

    if (showCodePerformance) {
      items.push({
        key: 'code-performance',
        label: strings('rewards_money.earnings.tab_code_performance'),
        content: null,
        testID: `${REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}-code-performance`,
      });
    }

    return items;
  }, [showCodePerformance]);

  if (tabs.length < 2) {
    return null;
  }

  return (
    <TabsBar
      tabs={tabs}
      activeIndex={activeIndex}
      onTabPress={onTabPress}
      testID={REWARDS_MONEY_TEST_IDS.EARNINGS_TABS}
    />
  );
};

/**
 * Code performance (code uses, first eligible action, active wallets, revenue
 * generating) has no endpoint on the backend's `main` or in any open PR, so the
 * tab states that plainly rather than rendering an empty chart.
 */
export const CodePerformancePlaceholder: React.FC = () => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="flex-1 p-8"
    testID={REWARDS_MONEY_TEST_IDS.EARNINGS_TAB_PLACEHOLDER}
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      {strings('rewards_money.earnings.code_performance_coming_soon')}
    </Text>
  </Box>
);

export default EarningsTabs;
