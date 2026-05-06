// Third party dependencies.
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { InteractionManager } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const TAB_LOAD_FALLBACK_TIMEOUT_MS = 250;

export interface BaseTabItem {
  key: string;
  isDisabled?: boolean;
  content: React.ReactNode;
}

interface UseTabsListOptions<T extends BaseTabItem> {
  tabs: T[];
  initialActiveIndex: number;
  onChangeTab?: (props: { i: number; ref: React.ReactNode }) => void;
}

interface UseTabsListResult {
  activeIndex: number;
  loadedTabs: Set<number>;
  handleTabPress: (index: number) => void;
  swipeGesture: ReturnType<typeof Gesture.Pan>;
}

export function useTabsList<T extends BaseTabItem>({
  tabs,
  initialActiveIndex,
  onChangeTab,
}: UseTabsListOptions<T>): UseTabsListResult {
  const normalizeTabIndex = useCallback(
    (tabIndex: number) => {
      if (
        tabIndex >= 0 &&
        tabIndex < tabs.length &&
        !tabs[tabIndex]?.isDisabled
      ) {
        return tabIndex;
      }
      const firstEnabled = tabs.findIndex((tab) => !tab.isDisabled);
      return firstEnabled >= 0 ? firstEnabled : -1;
    },
    [tabs],
  );

  const [activeIndex, setActiveIndex] = useState(() =>
    normalizeTabIndex(initialActiveIndex),
  );
  const [loadedTabs, setLoadedTabs] = useState<Set<number>>(new Set());
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingLoad = useCallback(() => {
    if (interactionHandleRef.current) {
      interactionHandleRef.current.cancel?.();
      interactionHandleRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < tabs.length) {
      cancelPendingLoad();

      if (loadedTabs.has(activeIndex)) {
        return;
      }

      const markLoaded = () => {
        setLoadedTabs((prev) => {
          if (prev.has(activeIndex)) return prev;
          const next = new Set(prev);
          next.add(activeIndex);
          return next;
        });
      };

      interactionHandleRef.current =
        InteractionManager.runAfterInteractions(markLoaded);
      fallbackTimeoutRef.current = setTimeout(
        markLoaded,
        TAB_LOAD_FALLBACK_TIMEOUT_MS,
      );
    }

    return () => {
      cancelPendingLoad();
    };
  }, [activeIndex, tabs.length, loadedTabs, cancelPendingLoad]);

  // Preserve active tab by key when the tabs array changes.
  // Falls back to initialActiveIndex if the active key disappears.
  useEffect(() => {
    const currentActiveTabKey =
      activeIndex >= 0 && activeIndex < tabs.length
        ? tabs[activeIndex]?.key
        : undefined;

    let nextIndex = -1;

    if (currentActiveTabKey && tabs.length > 0) {
      const newIndexForCurrentTab = tabs.findIndex(
        (tab) => tab.key === currentActiveTabKey,
      );
      if (
        newIndexForCurrentTab >= 0 &&
        !tabs[newIndexForCurrentTab].isDisabled
      ) {
        nextIndex = newIndexForCurrentTab;
      }
    }

    if (nextIndex === -1) {
      nextIndex = normalizeTabIndex(initialActiveIndex);
    }

    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  }, [activeIndex, initialActiveIndex, normalizeTabIndex, tabs]);

  const handleTabPress = useCallback(
    (tabIndex: number) => {
      if (
        tabIndex < 0 ||
        tabIndex >= tabs.length ||
        tabs[tabIndex]?.isDisabled
      ) {
        return;
      }

      const tabChanged = tabIndex !== activeIndex;
      setActiveIndex(tabIndex);

      if (onChangeTab && tabChanged) {
        onChangeTab({ i: tabIndex, ref: tabs[tabIndex]?.content || null });
      }
    },
    [activeIndex, tabs, onChangeTab],
  );

  const goToPreviousTab = useCallback(() => {
    for (let i = activeIndex - 1; i >= 0; i--) {
      if (!tabs[i]?.isDisabled) {
        handleTabPress(i);
        return;
      }
    }
  }, [activeIndex, tabs, handleTabPress]);

  const goToNextTab = useCallback(() => {
    for (let i = activeIndex + 1; i < tabs.length; i++) {
      if (!tabs[i]?.isDisabled) {
        handleTabPress(i);
        return;
      }
    }
  }, [activeIndex, tabs, handleTabPress]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-50, 50])
        .failOffsetY([-15, 15])
        .maxPointers(1)
        .onEnd((gestureEvent) => {
          'worklet';
          const { translationX, velocityX } = gestureEvent;
          if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 500) {
            if (translationX > 0) {
              runOnJS(goToPreviousTab)();
            } else if (translationX < 0) {
              runOnJS(goToNextTab)();
            }
          }
        }),
    [goToPreviousTab, goToNextTab],
  );

  return { activeIndex, loadedTabs, handleTabPress, swipeGesture };
}
