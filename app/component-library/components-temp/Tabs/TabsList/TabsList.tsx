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

// Timing constant for preloading adjacent tabs
const ADJACENT_PRELOAD_DELAY = 500;

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
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
    const [loadedTabs, setLoadedTabs] = useState<Set<number>>(new Set());

    const tabs: TabItem[] = useMemo(
      () =>
        React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            const props = child.props as {
              tabLabel?: string;
              isDisabled?: boolean;
            };
            const tabLabel = props.tabLabel || `Tab ${index + 1}`;
            const isDisabled = props.isDisabled || false;
            return {
              key: child.key?.toString() || `tab-${index}`,
              label: tabLabel,
              content: child,
              isDisabled,
              isLoaded: false,
            };
          }
          return {
            key: `tab-${index}`,
            label: `Tab ${index + 1}`,
            content: child,
            isDisabled: false,
            isLoaded: false,
          };
        }) || [],
      [children],
    );

    useEffect(() => {
      if (activeIndex >= 0 && activeIndex < tabs.length) {
        setLoadedTabs((prev) => {
          const newLoadedTabs = new Set(prev);
          newLoadedTabs.add(activeIndex);
          return newLoadedTabs.size !== prev.size ? newLoadedTabs : prev;
        });
      }
    }, [activeIndex, tabs.length]);

    useEffect(() => {
      if (activeIndex >= 0) {
        const preloadTimer = setTimeout(() => {
          setLoadedTabs((prev) => {
            const newLoadedTabs = new Set(prev);
            let hasChanges = false;

            if (activeIndex > 0 && !tabs[activeIndex - 1]?.isDisabled) {
              if (!newLoadedTabs.has(activeIndex - 1)) {
                newLoadedTabs.add(activeIndex - 1);
                hasChanges = true;
              }
            }

            if (
              activeIndex < tabs.length - 1 &&
              !tabs[activeIndex + 1]?.isDisabled
            ) {
              if (!newLoadedTabs.has(activeIndex + 1)) {
                newLoadedTabs.add(activeIndex + 1);
                hasChanges = true;
              }
            }

            return hasChanges ? newLoadedTabs : prev;
          });
        }, ADJACENT_PRELOAD_DELAY);

        return () => clearTimeout(preloadTimer);
      }
    }, [activeIndex, tabs]);

    useEffect(() => {
      const currentActiveTabKey = tabs[activeIndex]?.key;

      if (currentActiveTabKey && tabs.length > 0) {
        const newIndexForCurrentTab = tabs.findIndex(
          (tab) => tab.key === currentActiveTabKey,
        );
        if (
          newIndexForCurrentTab >= 0 &&
          !tabs[newIndexForCurrentTab].isDisabled &&
          newIndexForCurrentTab !== activeIndex
        ) {
          setActiveIndex(newIndexForCurrentTab);
          return;
        }
      }

      if (
        activeIndex >= 0 &&
        activeIndex < tabs.length &&
        !tabs[activeIndex]?.isDisabled
      ) {
        return;
      }

      const targetTab = tabs[initialActiveIndex];
      if (targetTab && !targetTab.isDisabled) {
        setActiveIndex(initialActiveIndex);
      } else {
        const firstEnabledIndex = tabs.findIndex((tab) => !tab.isDisabled);
        setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : -1);
      }
    }, [initialActiveIndex, tabs, activeIndex]);

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

        if (
          (process.env.JEST_WORKER_ID || process.env.E2E) &&
          !loadedTabs.has(tabIndex)
        ) {
          setLoadedTabs((prev) => new Set(prev).add(tabIndex));
        }

        if (onChangeTab && tabChanged) {
          onChangeTab({
            i: tabIndex,
            ref: tabs[tabIndex]?.content || null,
          });
        }
      },
      [activeIndex, tabs, onChangeTab, loadedTabs],
    );

    const goToPreviousTab = useCallback(() => {
      const prevIndex = activeIndex - 1;
      if (prevIndex >= 0 && !tabs[prevIndex]?.isDisabled) {
        handleTabPress(prevIndex);
      }
    }, [activeIndex, tabs, handleTabPress]);

    const goToNextTab = useCallback(() => {
      const nextIndex = activeIndex + 1;
      if (nextIndex < tabs.length && !tabs[nextIndex]?.isDisabled) {
        handleTabPress(nextIndex);
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
                <Box key={tab.key} twClassName={isActive ? '' : 'hidden'}>
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
