import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
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

export interface UseTokenDetailsV1TabsOptions {
  initialTab?: TokenDetailsV1TabKey;
  onTabChange?: (
    targetTab: TokenDetailsV1TabKey,
    currentTab: TokenDetailsV1TabKey,
  ) => void;
  onTabWillChange?: (
    targetTab: TokenDetailsV1TabKey,
    currentTab: TokenDetailsV1TabKey,
  ) => void;
}

export const useTokenDetailsV1Tabs = (
  initialTabOrOptions?: TokenDetailsV1TabKey | UseTokenDetailsV1TabsOptions,
): UseTokenDetailsV1TabsResult => {
  const options =
    typeof initialTabOrOptions === 'object' && initialTabOrOptions !== null
      ? initialTabOrOptions
      : undefined;
  const initialTab =
    typeof initialTabOrOptions === 'string'
      ? initialTabOrOptions
      : (options?.initialTab ?? TOKEN_DETAILS_V1_TABS[0]);
  const onTabChange = options?.onTabChange ?? options?.onTabWillChange;

  const [activeTab, setActiveTab] = useState<TokenDetailsV1TabKey>(initialTab);
  const [mountedTabs, setMountedTabs] = useState<Set<TokenDetailsV1TabKey>>(
    () => new Set([initialTab]),
  );

  const activateTab = useCallback(
    (tab: TokenDetailsV1TabKey) => {
      if (tab === activeTab) {
        return;
      }
      onTabChange?.(tab, activeTab);
      setActiveTab(tab);
      setMountedTabs((prev) => {
        if (prev.has(tab)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
    },
    [activeTab, onTabChange],
  );

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

export interface UseTokenDetailsV1ScrollStabilizationOptions {
  scrollViewRef?: React.RefObject<ScrollView | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export interface UseTokenDetailsV1ScrollStabilizationResult {
  scrollViewRef: React.RefObject<ScrollView | null>;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleTabBarLayout: (event: LayoutChangeEvent) => void;
  handleScrollViewLayout: (event: LayoutChangeEvent) => void;
  tabContentContainerStyle: ViewStyle;
  clampScrollToTabBar: () => void;
}

export const useTokenDetailsV1ScrollStabilization = (
  options?: UseTokenDetailsV1ScrollStabilizationOptions,
): UseTokenDetailsV1ScrollStabilizationResult => {
  const defaultScrollViewRef = useRef<ScrollView>(null);
  const scrollViewRef = options?.scrollViewRef ?? defaultScrollViewRef;
  const currentScrollYRef = useRef(0);
  const tabBarOffsetYRef = useRef<number | null>(null);

  const { height: windowHeight } = useWindowDimensions();
  const [scrollViewHeight, setScrollViewHeight] = useState(0);

  const minTabContentHeight = useMemo(
    () => Math.max(scrollViewHeight, windowHeight),
    [scrollViewHeight, windowHeight],
  );

  const tabContentContainerStyle = useMemo<ViewStyle>(
    () => ({ minHeight: minTabContentHeight }),
    [minTabContentHeight],
  );

  const handleTabBarLayout = useCallback((event: LayoutChangeEvent) => {
    tabBarOffsetYRef.current = event.nativeEvent.layout.y;
  }, []);

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }, []);

  const onScroll = options?.onScroll;
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      currentScrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  const clampScrollToTabBar = useCallback(() => {
    const tabBarOffsetY = tabBarOffsetYRef.current;
    if (tabBarOffsetY !== null && currentScrollYRef.current > tabBarOffsetY) {
      scrollViewRef.current?.scrollTo({
        y: tabBarOffsetY,
        animated: false,
      });
      currentScrollYRef.current = tabBarOffsetY;
    }
  }, [scrollViewRef]);

  return {
    scrollViewRef,
    handleScroll,
    handleTabBarLayout,
    handleScrollViewLayout,
    tabContentContainerStyle,
    clampScrollToTabBar,
  };
};

export interface TokenDetailsV1TabBarProps {
  activeTab: TokenDetailsV1TabKey;
  onTabPress: (tab: TokenDetailsV1TabKey) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const getTabLabel = (tab: TokenDetailsV1TabKey): string =>
  strings(`token_details_v1.tabs.${tab}`);

const getTabTestID = (tab: TokenDetailsV1TabKey): string =>
  `token-details-v1-tab-${tab}`;

const TokenDetailsV1TabBar = memo(
  ({ activeTab, onTabPress, onLayout }: TokenDetailsV1TabBarProps) => {
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
      // The rule is the unselected track the active indicator rides on, so it
      // runs the full width of the screen while the tabs themselves stay
      // inset. `TabsBar` only draws the active segment — it sizes and animates
      // one underline to the selected tab and has nothing continuous — so the
      // track belongs to the caller. It sits here rather than on `TabsBar`'s
      // own container because both edges land in the same place, and this is
      // the element that already identifies the tab bar.
      <Box
        twClassName="border-b border-muted bg-default pt-3"
        testID={TOKEN_DETAILS_V1_TAB_BAR_TEST_ID}
        onLayout={onLayout}
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
