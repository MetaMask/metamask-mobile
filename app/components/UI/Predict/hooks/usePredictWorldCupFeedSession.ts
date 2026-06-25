import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import type { PredictEntryPoint } from '../types/navigation';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import { PredictEventValues } from '../constants/eventNames';

export interface UsePredictWorldCupFeedSessionOptions<T extends string> {
  initialTab: T;
  /** Resolved entry point (with fallback applied). Used for analytics. */
  entryPoint: PredictEntryPoint;
  /** Raw route.params.entryPoint — used only for the back-navigation fallback. */
  routeEntryPoint?: PredictEntryPoint;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export interface UsePredictWorldCupFeedSessionResult<T extends string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  tabsScrollViewRef: React.RefObject<ScrollView | null>;
  feedSessionId: string;
  feedSessionStartTime: number;
  /** Returns the current number of feed pages viewed (tab switches since mount). */
  getPageViewCount: () => number;
  scrollActiveTabIntoView: (tabKey: T, animated: boolean) => void;
  handleTabLayout: (tabKey: T, event: LayoutChangeEvent) => void;
  handleTabPress: (tabKey: T) => void;
  /** Always navigates to the market list (no canGoBack check). Use when the screen becomes disabled. */
  navigateToMarketList: () => void;
  /** Navigates back if possible, otherwise falls back to the market list. */
  handleBack: () => void;
}

/**
 * Shared session and tab-management logic used by both the V1 World Cup screen
 * and the V2 World Cup Hub. Encapsulates:
 * - feed session identifiers (id, start time, page view count)
 * - active-tab state and scroll-into-view mechanics
 * - tab-press handler that fires `trackFeedViewed`
 * - back-navigation handler
 */
export function usePredictWorldCupFeedSession<T extends string>({
  initialTab,
  entryPoint,
  routeEntryPoint,
  transactionActiveAbTests,
}: UsePredictWorldCupFeedSessionOptions<T>): UsePredictWorldCupFeedSessionResult<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();

  const tabsScrollViewRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const hasScrolledToInitialTabRef = useRef(false);
  const hasTrackedInitialFeedViewed = useRef(false);
  const feedSessionId = useMemo(() => uuidv4(), []);
  const feedSessionStartTime = useMemo(() => Date.now(), []);
  const feedPageViewCount = useRef(0);

  const [activeTab, setActiveTab] = useState<T>(initialTab);

  // Sync active tab whenever the resolved initial tab changes (e.g. after
  // availability data loads in V1).
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const scrollActiveTabIntoView = useCallback(
    (tabKey: T, animated: boolean) => {
      const layout = tabLayoutsRef.current[tabKey];
      if (!layout || !tabsScrollViewRef.current) return;
      const targetX = Math.max(layout.x - 16, 0);
      tabsScrollViewRef.current.scrollTo({ x: targetX, animated });
    },
    [],
  );

  const handleTabLayout = useCallback(
    (tabKey: T, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabLayoutsRef.current[tabKey] = { x, width };
      if (!hasScrolledToInitialTabRef.current && tabKey === activeTab) {
        hasScrolledToInitialTabRef.current = true;
        scrollActiveTabIntoView(tabKey, false);
      }
    },
    [activeTab, scrollActiveTabIntoView],
  );

  const handleTabPress = useCallback(
    (tabKey: T) => {
      if (tabKey === activeTab) return;
      feedPageViewCount.current += 1;
      Engine.context.PredictController.trackFeedViewed({
        sessionId: feedSessionId,
        feedTab: tabKey,
        predictScreen: PredictEventValues.PREDICT_SCREEN.WORLD_CUP,
        numPagesViewed: feedPageViewCount.current,
        sessionTime: Math.round((Date.now() - feedSessionStartTime) / 1000),
        entryPoint,
        isSessionEnd: false,
      });
      setActiveTab(tabKey);
    },
    [activeTab, entryPoint, feedSessionId, feedSessionStartTime],
  );

  const navigateToMarketList = useCallback(() => {
    navigation.navigate(Routes.PREDICT.MARKET_LIST, {
      entryPoint: routeEntryPoint,
      ...(transactionActiveAbTests?.length && { transactionActiveAbTests }),
    });
  }, [navigation, routeEntryPoint, transactionActiveAbTests]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigateToMarketList();
  }, [navigation, navigateToMarketList]);

  const getPageViewCount = useCallback(() => feedPageViewCount.current, []);

  // Keep the active pill visible when the tab changes.
  useEffect(() => {
    scrollActiveTabIntoView(activeTab, true);
  }, [activeTab, scrollActiveTabIntoView]);

  return {
    activeTab,
    setActiveTab,
    tabsScrollViewRef,
    feedSessionId,
    feedSessionStartTime,
    getPageViewCount,
    scrollActiveTabIntoView,
    handleTabLayout,
    handleTabPress,
    navigateToMarketList,
    handleBack,
  };
}
