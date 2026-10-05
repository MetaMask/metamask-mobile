import React, { memo, useCallback, useMemo, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Box } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../locales/i18n';
import {
  TOKEN_DETAILS_V1_TABS,
  type TokenDetailsV1TabKey,
} from '../constants/constants';

export { TOKEN_DETAILS_V1_TABS } from '../constants/constants';

export const TOKEN_DETAILS_V1_TAB_BAR_TEST_ID = 'token-details-v1-tab-bar';

export const SWIPE_ACTIVATION_OFFSET_PX = 50;
export const SWIPE_FAIL_OFFSET_PX = 15;
export const SWIPE_TRANSLATION_THRESHOLD_PX = 50;
export const SWIPE_VELOCITY_THRESHOLD_PX = 500;

export const HIDDEN_TAB_PAGE_STYLE: ViewStyle = { display: 'none' };

export const resolveSwipeTargetTab = (
  activeTab: TokenDetailsV1TabKey,
  translationX: number,
  velocityX: number,
): TokenDetailsV1TabKey | null => {
  const activeIndex = TOKEN_DETAILS_V1_TABS.indexOf(activeTab);
  if (activeIndex < 0) {
    return null;
  }
  const isDecisive =
    Math.abs(translationX) > SWIPE_TRANSLATION_THRESHOLD_PX ||
    Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD_PX;
  if (!isDecisive) {
    return null;
  }
  const targetIndex = translationX > 0 ? activeIndex - 1 : activeIndex + 1;
  return TOKEN_DETAILS_V1_TABS[targetIndex] ?? null;
};

export interface UseTokenDetailsV1TabsResult {
  activeTab: TokenDetailsV1TabKey;
  activateTab: (tab: TokenDetailsV1TabKey) => void;
  mountedTabs: Set<TokenDetailsV1TabKey>;
  swipeGesture: PanGesture;
}

export const useTokenDetailsV1Tabs = (
  initialTab: TokenDetailsV1TabKey = TOKEN_DETAILS_V1_TABS[0],
): UseTokenDetailsV1TabsResult => {
  const [activeTab, setActiveTab] = useState<TokenDetailsV1TabKey>(initialTab);
  const [mountedTabs, setMountedTabs] = useState<Set<TokenDetailsV1TabKey>>(
    () => new Set([initialTab]),
  );

  const activateTab = useCallback((tab: TokenDetailsV1TabKey) => {
    setActiveTab(tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  const handleSwipeEnd = useCallback(
    (translationX: number, velocityX: number) => {
      const targetTab = resolveSwipeTargetTab(
        activeTab,
        translationX,
        velocityX,
      );
      if (targetTab) {
        activateTab(targetTab);
      }
    },
    [activeTab, activateTab],
  );

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([
          -SWIPE_ACTIVATION_OFFSET_PX,
          SWIPE_ACTIVATION_OFFSET_PX,
        ])
        .failOffsetY([-SWIPE_FAIL_OFFSET_PX, SWIPE_FAIL_OFFSET_PX])
        .maxPointers(1)
        .onEnd((event) => {
          'worklet';
          scheduleOnRN(handleSwipeEnd, event.translationX, event.velocityX);
        }),
    [handleSwipeEnd],
  );

  return {
    activeTab,
    activateTab,
    mountedTabs,
    swipeGesture,
  };
};

export interface TokenDetailsV1TabBarProps {
  activeTab: TokenDetailsV1TabKey;
  onTabPress: (tab: TokenDetailsV1TabKey) => void;
}

const getTabLabel = (tab: TokenDetailsV1TabKey): string =>
  strings(`token_details_v1.tabs.${tab}`);

const getTabTestID = (tab: TokenDetailsV1TabKey): string =>
  `token-details-v1-tab-${tab}`;

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
