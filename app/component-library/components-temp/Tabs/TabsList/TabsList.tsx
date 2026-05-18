import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import { Box } from '@metamask/design-system-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { InteractionManager } from 'react-native';

import TabsBar from '../TabsBar';
import { TabsListProps, TabsListRef, TabItem } from './TabsList.types';

const TAB_LOAD_FALLBACK_TIMEOUT_MS = 250;

const TabsList = forwardRef<TabsListRef, TabsListProps>(
  (
    {
      children,
      initialActiveIndex = 0,
      onChangeTab,
      testID,
      tabsBarProps,
      tabsListContentTwClassName,
      ...boxProps
    },
    ref,
  ) => {
    const tabs: TabItem[] = useMemo(
      () =>
        React.Children.toArray(children)
          .filter((child) => React.isValidElement(child))
          .map((child, index) => {
            const props = (child as React.ReactElement).props as {
              tabLabel?: string;
              isDisabled?: boolean;
              testID?: string;
            };
            const tabLabel = props.tabLabel || `Tab ${index + 1}`;
            const isDisabled = props.isDisabled || false;
            return {
              key:
                (child as React.ReactElement).key?.toString() || `tab-${index}`,
              label: tabLabel,
              content: child,
              isDisabled,
              isLoaded: false,
              testID: props.testID,
            };
          }),
      [children],
    );

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
    const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

    // Cancel any pending InteractionManager + fallback timeout
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

    // Schedule tab content loading via InteractionManager with a fallback timeout
    // in case the InteractionManager callback never fires (observed in repeated
    // Perps Home -> Activity navigation)
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
          onChangeTab({
            i: tabIndex,
            ref: tabs[tabIndex]?.content || null,
          });
        }
      },
      [activeIndex, tabs, onChangeTab],
    );

    const goToPreviousTab = useCallback(() => {
      // Iterate backwards to find the next enabled tab
      for (let i = activeIndex - 1; i >= 0; i--) {
        if (!tabs[i]?.isDisabled) {
          handleTabPress(i);
          return;
        }
      }
    }, [activeIndex, tabs, handleTabPress]);

    const goToNextTab = useCallback(() => {
      // Iterate forwards to find the next enabled tab
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

            // Match ScrollView paging behavior with lower thresholds for natural feel
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

    useImperativeHandle(
      ref,
      () => ({
        goToTabIndex: (tabIndex: number) => {
          handleTabPress(tabIndex);
        },
        getCurrentIndex: () => activeIndex,
      }),
      [activeIndex, handleTabPress],
    );

    const tabBarPropsComputed = useMemo(
      () => ({
        tabs,
        activeIndex,
        onTabPress: handleTabPress,
        testID: testID ? `${testID}-bar` : undefined,
        ...tabsBarProps,
      }),
      [tabs, activeIndex, handleTabPress, testID, tabsBarProps],
    );

    return (
      <Box twClassName="flex-1" testID={testID} {...boxProps}>
        <TabsBar {...tabBarPropsComputed} />

        <GestureDetector gesture={swipeGesture}>
          <Box
            twClassName={`flex-1 mt-2 px-4 ${tabsListContentTwClassName || ''}`}
            testID={testID ? `${testID}-content` : undefined}
          >
            {tabs.map((tab, index) => {
              const isActive = index === activeIndex;
              const isLoaded = loadedTabs.has(index);

              if (!isLoaded) return null;

              return (
                <Box
                  key={tab.key}
                  twClassName={isActive ? 'flex-1' : 'hidden'}
                  pointerEvents={!isActive ? 'none' : 'auto'}
                >
                  {tab.content}
                </Box>
              );
            })}
          </Box>
        </GestureDetector>
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
