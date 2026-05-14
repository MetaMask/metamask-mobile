import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import {
  selectPredictHotTabFlag,
  selectPredictWorldCupConfig,
  selectPredictWorldCupMainFeedTabEnabledFlag,
} from '../selectors/featureFlags';
import {
  PREDICT_BASE_TABS,
  PREDICT_HOT_TAB,
  PREDICT_WORLD_CUP_TAB,
  isPredictTabKey,
  type PredictTabKey,
} from '../constants/feedTabs';
import type { PredictNavigationParamList } from '../types/navigation';
import { buildPredictWorldCupAllQuery } from '../utils/worldCup';

export interface FeedTab {
  key: PredictTabKey;
  label: string;
  customQueryParams?: string;
}

export interface UsePredictTabsResult {
  tabs: FeedTab[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  initialTabKey: PredictTabKey;
}

export const usePredictTabs = (): UsePredictTabsResult => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketList'>>();
  const hotTabFlag = useSelector(selectPredictHotTabFlag);
  const isWorldCupMainFeedTabEnabled = useSelector(
    selectPredictWorldCupMainFeedTabEnabledFlag,
  );
  const worldCupConfig = useSelector(selectPredictWorldCupConfig);

  const tabs: FeedTab[] = useMemo(() => {
    const baseTabs: FeedTab[] = PREDICT_BASE_TABS.map((tab) => ({
      key: tab.key,
      label: strings(tab.labelKey),
    }));

    if (hotTabFlag.enabled) {
      baseTabs.unshift({
        key: PREDICT_HOT_TAB.key,
        label: strings(PREDICT_HOT_TAB.labelKey),
        customQueryParams: hotTabFlag.queryParams,
      });
    }

    if (isWorldCupMainFeedTabEnabled) {
      baseTabs.unshift({
        key: PREDICT_WORLD_CUP_TAB.key,
        label: strings(PREDICT_WORLD_CUP_TAB.labelKey),
        customQueryParams: buildPredictWorldCupAllQuery(worldCupConfig),
      });
    }

    return baseTabs;
  }, [
    hotTabFlag.enabled,
    hotTabFlag.queryParams,
    isWorldCupMainFeedTabEnabled,
    worldCupConfig,
  ]);

  const requestedValidTabKey = isPredictTabKey(route.params?.tab)
    ? route.params?.tab
    : undefined;
  const requestedTabKey = tabs.some((tab) => tab.key === requestedValidTabKey)
    ? requestedValidTabKey
    : undefined;

  const initialTabKeyRef = useRef<PredictTabKey>(
    requestedTabKey ?? tabs[0].key,
  );

  const getInitialIndex = useCallback((tabsArray: FeedTab[]): number => {
    const key = initialTabKeyRef.current;
    const index = tabsArray.findIndex((tab) => tab.key === key);
    return Math.max(index, 0);
  }, []);

  const [activeIndex, setActiveIndexState] = useState(() =>
    getInitialIndex(tabs),
  );

  const prevRequestedTabKeyRef = useRef<PredictTabKey | undefined>(
    requestedTabKey,
  );
  const isFollowingDeeplinkRef = useRef(Boolean(requestedTabKey));

  useEffect(() => {
    if (!requestedTabKey) {
      prevRequestedTabKeyRef.current = undefined;
      isFollowingDeeplinkRef.current = false;
      return;
    }

    const isNewDeeplinkNavigation =
      requestedTabKey !== prevRequestedTabKeyRef.current;

    if (isNewDeeplinkNavigation) {
      isFollowingDeeplinkRef.current = true;
    }

    if (!isFollowingDeeplinkRef.current) {
      prevRequestedTabKeyRef.current = requestedTabKey;
      return;
    }

    const requestedIndex = tabs.findIndex((tab) => tab.key === requestedTabKey);
    if (requestedIndex >= 0) {
      setActiveIndexState(requestedIndex);
    }

    prevRequestedTabKeyRef.current = requestedTabKey;
  }, [requestedTabKey, tabs]);

  const setActiveIndex = useCallback((index: number) => {
    setActiveIndexState((prevIndex) => {
      if (index !== prevIndex) {
        isFollowingDeeplinkRef.current = false;
      }
      return index;
    });
  }, []);

  return {
    tabs,
    activeIndex,
    setActiveIndex,
    initialTabKey: initialTabKeyRef.current,
  };
};
