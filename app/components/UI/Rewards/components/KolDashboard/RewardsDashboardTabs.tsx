import React, { useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import type { RewardsDashboardTab } from './RewardsDashboardTabs.types';

interface RewardsDashboardTabsProps {
  activeTab: RewardsDashboardTab;
  showEarningsDot: boolean;
  onChangeTab: (tab: RewardsDashboardTab) => void;
}

const TAB_ORDER: RewardsDashboardTab[] = [
  'waysToEarn',
  'earnings',
  'performance',
];

const RewardsDashboardTabs: React.FC<RewardsDashboardTabsProps> = ({
  activeTab,
  showEarningsDot,
  onChangeTab,
}) => {
  // `content` is unused: the dashboard renders each tab's sections inside its
  // own scroll view, so TabsBar renders the bar only.
  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'waysToEarn',
        label: strings('rewards.kol.ways_to_earn'),
        content: null,
        testID: KOL_DASHBOARD_SELECTORS.TAB_WAYS_TO_EARN,
      },
      {
        key: 'earnings',
        label: strings('rewards.kol.earnings_tab'),
        content: null,
        testID: KOL_DASHBOARD_SELECTORS.TAB_EARNINGS,
        showsIndicatorDot: showEarningsDot,
      },
      {
        key: 'performance',
        label: strings('rewards.kol.performance_title'),
        content: null,
        testID: KOL_DASHBOARD_SELECTORS.TAB_PERFORMANCE,
      },
    ],
    [showEarningsDot],
  );

  return (
    <Box testID={KOL_DASHBOARD_SELECTORS.TABS}>
      <TabsBar
        tabs={tabs}
        activeIndex={TAB_ORDER.indexOf(activeTab)}
        onTabPress={(index) => onChangeTab(TAB_ORDER[index])}
        testID={KOL_DASHBOARD_SELECTORS.TABS_BAR}
      />
    </Box>
  );
};

export default RewardsDashboardTabs;
