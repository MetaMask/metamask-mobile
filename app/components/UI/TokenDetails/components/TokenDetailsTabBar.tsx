import React, { memo, useCallback, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../locales/i18n';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';

export enum TokenDetailsTab {
  Overview = 'overview',
  Feed = 'feed',
}

/** Ordered tabs rendered by {@link TokenDetailsTabBar}. */
export const TOKEN_DETAILS_TABS: readonly TokenDetailsTab[] = [
  TokenDetailsTab.Overview,
  TokenDetailsTab.Feed,
];

const TAB_LABEL_KEYS: Record<TokenDetailsTab, string> = {
  [TokenDetailsTab.Overview]: 'asset_overview.tabs.overview',
  [TokenDetailsTab.Feed]: 'asset_overview.tabs.feed',
};

const TAB_TEST_IDS: Record<TokenDetailsTab, string> = {
  [TokenDetailsTab.Overview]: TokenOverviewSelectorsIDs.TAB_OVERVIEW,
  [TokenDetailsTab.Feed]: TokenOverviewSelectorsIDs.TAB_FEED,
};

export interface TokenDetailsTabBarProps {
  activeTab: TokenDetailsTab;
  onTabPress: (tab: TokenDetailsTab) => void;
  testID?: string;
}

/**
 * Overview / Feed tab bar for the token details screen.
 * Same `TabsBar` stack as Predict market details (animated underline).
 */
const TokenDetailsTabBar = memo(
  ({
    activeTab,
    onTabPress,
    testID = TokenOverviewSelectorsIDs.TABS_BAR,
  }: TokenDetailsTabBarProps) => {
    const tabItems: TabItem[] = useMemo(
      () =>
        TOKEN_DETAILS_TABS.map((tab) => ({
          key: tab,
          label: strings(TAB_LABEL_KEYS[tab]),
          content: null,
          testID: TAB_TEST_IDS[tab],
        })),
      [],
    );

    const activeIndex = Math.max(TOKEN_DETAILS_TABS.indexOf(activeTab), 0);

    const handleTabPress = useCallback(
      (index: number) => {
        const tab = TOKEN_DETAILS_TABS[index];
        if (tab) {
          onTabPress(tab);
        }
      },
      [onTabPress],
    );

    return (
      <Box twClassName="bg-default pt-2">
        <TabsBar
          tabs={tabItems}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
          testID={testID}
          twClassName="!px-3"
        />
      </Box>
    );
  },
);

TokenDetailsTabBar.displayName = 'TokenDetailsTabBar';

export default TokenDetailsTabBar;
