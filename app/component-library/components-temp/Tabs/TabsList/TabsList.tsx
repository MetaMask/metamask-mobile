import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';

import { Box } from '@metamask/design-system-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import TabsBar from '../TabsBar';
import { TabsListProps, TabsListRef, TabItem } from './TabsList.types';

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
            };
          }),
      [children],
    );

    const getFirstEnabledIndex = useCallback(
      () => tabs.findIndex((tab) => !tab.isDisabled),
      [tabs],
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
        const firstEnabledIndex = getFirstEnabledIndex();
        return firstEnabledIndex >= 0 ? firstEnabledIndex : -1;
      },
      [getFirstEnabledIndex, tabs],
    );

    const [activeIndex, setActiveIndex] = useState(() =>
      normalizeTabIndex(initialActiveIndex),
    );
    const [loadedTabs, setLoadedTabs] = useState<Set<number>>(() => {
      const normalizedInitialIndex = normalizeTabIndex(initialActiveIndex);
      return normalizedInitialIndex >= 0
        ? new Set([normalizedInitialIndex])
        : new Set();
    });

    const markTabLoaded = useCallback(
      (tabIndex: number) => {
        if (
          tabIndex < 0 ||
          tabIndex >= tabs.length ||
          tabs[tabIndex]?.isDisabled
        ) {
          return;
        }

        setLoadedTabs((prev) => {
          if (prev.has(tabIndex)) {
            return prev;
          }
          const nextLoadedTabs = new Set(prev);
          nextLoadedTabs.add(tabIndex);
          return nextLoadedTabs;
        });
      },
      [tabs],
    );

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

      if (nextIndex >= 0) {
        markTabLoaded(nextIndex);
      }
    }, [
      activeIndex,
      initialActiveIndex,
      markTabLoaded,
      normalizeTabIndex,
      tabs,
    ]);

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
        markTabLoaded(tabIndex);

        if (onChangeTab && tabChanged) {
          onChangeTab({
            i: tabIndex,
            ref: tabs[tabIndex]?.content || null,
          });
        }
      },
      [activeIndex, markTabLoaded, onChangeTab, tabs],
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
