import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import { selectPredictHotTabFlag } from '../selectors/featureFlags';
import {
  PREDICT_FEED_BASE_TABS,
  PREDICT_FEED_DEFAULT_TAB,
  PREDICT_FEED_HOT_TAB,
  isPredictFeedTabKey,
  type PredictFeedTabKey,
} from '../constants/feedTabs';
import type { PredictNavigationParamList } from '../types/navigation';

export interface FeedTab {
  key: PredictFeedTabKey;
  label: string;
}

export interface UsePredictTabsResponse {
  tabs: FeedTab[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  initialTabKey: PredictFeedTabKey;
  hotTabQueryParams?: string;
}

export const usePredictTabs = (): UsePredictTabsResponse => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketList'>>();
  const hotTabFlag = useSelector(selectPredictHotTabFlag);

  const tabs: FeedTab[] = useMemo(() => {
    const baseTabs: FeedTab[] = PREDICT_FEED_BASE_TABS.map((tab) => ({
      key: tab.key,
      label: strings(tab.labelKey),
    }));

    if (hotTabFlag.enabled) {
      baseTabs.unshift({
        key: PREDICT_FEED_HOT_TAB.key,
        label: strings(PREDICT_FEED_HOT_TAB.labelKey),
      });
    }

    return baseTabs;
  }, [hotTabFlag.enabled]);

  const requestedTabKey = isPredictFeedTabKey(route.params?.tab)
    ? route.params?.tab
    : undefined;

  const initialTabKeyRef = useRef<PredictFeedTabKey>(
    requestedTabKey ?? PREDICT_FEED_DEFAULT_TAB,
  );

  const getInitialIndex = useCallback((tabsArray: FeedTab[]): number => {
    const key = initialTabKeyRef.current;
    const index = tabsArray.findIndex((tab) => tab.key === key);
    if (index >= 0) return index;

    const fallbackIndex = tabsArray.findIndex(
      (tab) => tab.key === PREDICT_FEED_DEFAULT_TAB,
    );
    return fallbackIndex >= 0 ? fallbackIndex : 0;
  }, []);

  const [activeIndex, setActiveIndex] = useState(() => getInitialIndex(tabs));

  const prevRequestedTabKeyRef = useRef<PredictFeedTabKey | undefined>(
    requestedTabKey,
  );

  useEffect(() => {
    if (!requestedTabKey) {
      prevRequestedTabKeyRef.current = undefined;
      return;
    }

    const isNewDeeplinkNavigation =
      requestedTabKey !== prevRequestedTabKeyRef.current;
    if (!isNewDeeplinkNavigation) return;

    const requestedIndex = tabs.findIndex((tab) => tab.key === requestedTabKey);
    if (requestedIndex >= 0) {
      setActiveIndex(requestedIndex);
    }

    prevRequestedTabKeyRef.current = requestedTabKey;
  }, [requestedTabKey, tabs]);

  return {
    tabs,
    activeIndex,
    setActiveIndex,
    initialTabKey: initialTabKeyRef.current,
    hotTabQueryParams: hotTabFlag.queryParams,
  };
};
