import React, { memo, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../locales/i18n';
import type { TokenDetailsV1TabKey } from '../constants/constants';

export const TOKEN_DETAILS_V1_TAB_BAR_TEST_ID = 'token-details-v1-tab-bar';

/** Stable tab order. Index order matters — Overview is the default tab. */
export const TOKEN_DETAILS_V1_TABS: TokenDetailsV1TabKey[] = [
  'overview',
  'security',
  'feed',
];

export interface TokenDetailsV1TabBarProps {
  activeTab: TokenDetailsV1TabKey;
  onTabPress: (tab: TokenDetailsV1TabKey) => void;
}

const getTabLabel = (tab: TokenDetailsV1TabKey): string =>
  strings(`token_details_v1.tabs.${tab}`);

const getTabTestID = (tab: TokenDetailsV1TabKey): string =>
  `token-details-v1-tab-${tab}`;

/**
 * Token Details V1 tab bar (Overview / Security / Feed).
 *
 * Rendered as a direct ScrollView child so it can be registered in
 * `stickyHeaderIndices` and dock below the nav header while scrolling.
 * Opaque `bg-default` background keeps scrolled content hidden behind the
 * docked bar.
 */
const TokenDetailsV1TabBar = memo(
  ({ activeTab, onTabPress }: TokenDetailsV1TabBarProps) => {
    const tabs = useMemo<TabItem[]>(
      () =>
        TOKEN_DETAILS_V1_TABS.map((tab) => ({
          key: tab,
          label: getTabLabel(tab),
          content: null,
          testID: getTabTestID(tab),
        })),
      [],
    );

    const activeIndex = TOKEN_DETAILS_V1_TABS.indexOf(activeTab);

    const handleTabPress = useMemo(
      () => (index: number) => {
        const tab = TOKEN_DETAILS_V1_TABS[index];
        if (tab) {
          onTabPress(tab);
        }
      },
      [onTabPress],
    );

    return (
      <Box
        twClassName="bg-default pt-3"
        testID={TOKEN_DETAILS_V1_TAB_BAR_TEST_ID}
      >
        <TabsBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
        />
      </Box>
    );
  },
);

TokenDetailsV1TabBar.displayName = 'TokenDetailsV1TabBar';

export default TokenDetailsV1TabBar;
