import React, { memo, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../../../component-library/components-temp/Tabs';
import {
  getPredictMarketDetailsSelector,
  PredictMarketDetailsSelectorsIDs,
  type PredictMarketDetailsTabKey,
} from '../../../../Predict.testIds';

export interface PredictMarketDetailsTabBarProps {
  tabs: { label: string; key: PredictMarketDetailsTabKey }[];
  activeTab: number | null;
  onTabPress: (tabIndex: number) => void;
}

const clampActiveIndex = (
  activeTab: number | null,
  tabCount: number,
): number => {
  if (tabCount === 0) {
    return 0;
  }
  if (activeTab === null || activeTab < 0) {
    return 0;
  }
  if (activeTab >= tabCount) {
    return tabCount - 1;
  }
  return activeTab;
};

/**
 * Market / game details tabs — same `TabsBar` + `Tab` stack as {@link PredictFeedTabBar}
 * (body md typography, animated underline, horizontal scroll when needed).
 */
const PredictMarketDetailsTabBar = memo(
  ({ tabs, activeTab, onTabPress }: PredictMarketDetailsTabBarProps) => {
    const tabItems: TabItem[] = useMemo(
      () =>
        tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          content: null,
          testID: getPredictMarketDetailsSelector.tabBarTab(tab.key),
        })),
      [tabs],
    );

    const activeIndex = useMemo(
      () => clampActiveIndex(activeTab, tabs.length),
      [activeTab, tabs.length],
    );

    if (tabs.length === 0) {
      return (
        <Box
          twClassName="bg-default pt-4"
          testID={PredictMarketDetailsSelectorsIDs.TAB_BAR}
        />
      );
    }

    return (
      <Box twClassName="bg-default pt-4">
        <TabsBar
          tabs={tabItems}
          activeIndex={activeIndex}
          onTabPress={onTabPress}
          testID={PredictMarketDetailsSelectorsIDs.TAB_BAR}
          twClassName="!px-3"
        />
      </Box>
    );
  },
);

PredictMarketDetailsTabBar.displayName = 'PredictMarketDetailsTabBar';

export default PredictMarketDetailsTabBar;
