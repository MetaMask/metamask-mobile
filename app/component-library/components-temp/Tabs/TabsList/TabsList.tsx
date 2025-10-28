// Third party dependencies.
import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
} from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

// Internal dependencies.
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
      autoHeight = false,
      ...boxProps
    },
    ref,
  ) => {
    const tw = useTailwind();
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
    const [containerWidth, setContainerWidth] = useState(
      Dimensions.get('window').width,
    );
    const [loadedTabs, setLoadedTabs] = useState<Set<number>>(new Set());
    const [tabHeights, setTabHeights] = useState<Map<string, number>>(
      new Map(),
    );
    const [scrollViewHeight, setScrollViewHeight] = useState<
      number | undefined
    >(undefined);
    const scrollViewRef = useRef<ScrollView>(null);
    const tabContentRefs = useRef<Map<string, View>>(new Map());
    const isScrolling = useRef(false);
    const isProgrammaticScroll = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const loadTabTimeout = useRef<NodeJS.Timeout | null>(null);
    const programmaticScrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const goToTabTimeout = useRef<NodeJS.Timeout | null>(null);
    const measurementTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Extract tab items from children
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

    // Create a separate array of only enabled tabs for ScrollView content
    const enabledTabs = useMemo(
      () =>
        tabs
          .map((tab, index) => ({ ...tab, originalIndex: index }))
          .filter((tab) => !tab.isDisabled),
      [tabs],
    );

    // Create mapping functions between tab index and content index
    const getContentIndexFromTabIndex = useCallback(
      (tabIndex: number): number => {
        if (
          tabIndex < 0 ||
          tabIndex >= tabs.length ||
          tabs[tabIndex]?.isDisabled
        ) {
          return -1;
        }
        return enabledTabs.findIndex(
          (enabledTab) => enabledTab.originalIndex === tabIndex,
        );
      },
      [tabs, enabledTabs],
    );

    const getTabIndexFromContentIndex = useCallback(
      (contentIndex: number): number => {
        if (contentIndex < 0 || contentIndex >= enabledTabs.length) {
          return -1;
        }
        return enabledTabs[contentIndex]?.originalIndex ?? -1;
      },
      [enabledTabs],
    );

    // Check if there are any enabled tabs and if current active tab is enabled
    const hasAnyEnabledTabs = useMemo(
      () => tabs.some((tab) => !tab.isDisabled),
      [tabs],
    );

    const shouldShowContent = useMemo(() => {
      // Don't show any content if all tabs are disabled
      if (!hasAnyEnabledTabs) return false;
      // Don't show content if active tab is disabled
      if (activeIndex < 0 || activeIndex >= tabs.length) return false;
      return !tabs[activeIndex]?.isDisabled;
    }, [hasAnyEnabledTabs, activeIndex, tabs]);

    // Clean up stale heights when tabs change
    useEffect(() => {
      const currentTabKeys = new Set(tabs.map((tab) => tab.key));
      setTabHeights((prev) => {
        const newHeights = new Map(prev);
        let hasChanges = false;

        // Remove heights for tabs that no longer exist
        Array.from(newHeights.keys()).forEach((key) => {
          if (!currentTabKeys.has(key)) {
            newHeights.delete(key);
            hasChanges = true;
          }
        });

        return hasChanges ? newHeights : prev;
      });

      // Clean up refs for removed tabs
      Array.from(tabContentRefs.current.keys()).forEach((key) => {
        if (!currentTabKeys.has(key)) {
          tabContentRefs.current.delete(key);
        }
      });

      // Clean up timers for removed tabs
      Array.from(measurementTimers.current.keys()).forEach((key) => {
        if (!currentTabKeys.has(key)) {
          const timer = measurementTimers.current.get(key);
          if (timer) {
            clearTimeout(timer);
            measurementTimers.current.delete(key);
          }
        }
      });
    }, [tabs]);

    // Debounced measurement function using tab key
    const measureTabHeight = useCallback((tabKey: string) => {
      const tabContentRef = tabContentRefs.current.get(tabKey);
      if (!tabContentRef) return;

      // Clear any existing measurement timer for this tab
      const existingTimer = measurementTimers.current.get(tabKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Debounce measurement to allow content to settle
      const timer = setTimeout(() => {
        if (tabContentRefs.current.has(tabKey)) {
          tabContentRef.measure(
            (
              _x: number,
              _y: number,
              _width: number,
              height: number,
              _pageX: number,
              _pageY: number,
            ) => {
              if (height > 0 && tabContentRefs.current.has(tabKey)) {
                setTabHeights((prev) => {
                  const currentHeight = prev.get(tabKey);
                  // Only update if height changed significantly
                  if (!currentHeight || Math.abs(currentHeight - height) > 5) {
                    const newHeights = new Map(prev);
                    newHeights.set(tabKey, height);
                    return newHeights;
                  }
                  return prev;
                });
              }
            },
          );
        }
        measurementTimers.current.delete(tabKey);
      }, 100);

      measurementTimers.current.set(tabKey, timer);
    }, []);

    useEffect(() => {
      // Only measure heights when autoHeight mode is enabled
      if (!autoHeight) {
        setScrollViewHeight(undefined);
        return;
      }

      const activeTab = tabs[activeIndex];
      if (!activeTab) {
        setScrollViewHeight(undefined);
        return;
      }

      const currentTabHeight = tabHeights.get(activeTab.key);

      if (currentTabHeight && currentTabHeight > 0) {
        // If we have a cached height, use it immediately for smooth transitions
        setScrollViewHeight(currentTabHeight);
      } else {
        // Don't set a height until we measure the actual content
        // This allows the content to render at its natural height
        setScrollViewHeight(undefined);

        // Trigger measurement after a brief delay to let content render
        if (activeIndex >= 0 && loadedTabs.has(activeIndex)) {
          let isMeasurementRelevant = true;
          let rafCleanup: (() => void) | undefined;

          const timeoutId = setTimeout(() => {
            if (isMeasurementRelevant) {
              // Use RAF for measurement
              const rafId = requestAnimationFrame(() => {
                if (tabContentRefs.current.has(activeTab.key)) {
                  measureTabHeight(activeTab.key);
                }
              });
              rafCleanup = () => cancelAnimationFrame(rafId);
            }
          }, 50);

          return () => {
            isMeasurementRelevant = false;
            clearTimeout(timeoutId);
            if (rafCleanup) {
              rafCleanup();
            }
          };
        }
      }
    }, [
      activeIndex,
      tabHeights,
      loadedTabs,
      measureTabHeight,
      tabs,
      autoHeight,
    ]);

    useEffect(() => {
      if (activeIndex >= 0 && activeIndex < tabs.length) {
        setLoadedTabs((prev) => {
          const newLoadedTabs = new Set(prev);
          newLoadedTabs.add(activeIndex);
          return newLoadedTabs.size !== prev.size ? newLoadedTabs : prev;
        });
      }
    }, [activeIndex, tabs.length]);

    // Cleanup effect to clear all timers on unmount
    useEffect(
      () => () => {
        if (scrollTimeout.current) {
          clearTimeout(scrollTimeout.current);
          scrollTimeout.current = null;
        }
        if (loadTabTimeout.current) {
          clearTimeout(loadTabTimeout.current);
          loadTabTimeout.current = null;
        }
        if (programmaticScrollTimeout.current) {
          clearTimeout(programmaticScrollTimeout.current);
          programmaticScrollTimeout.current = null;
        }
        if (goToTabTimeout.current) {
          clearTimeout(goToTabTimeout.current);
          goToTabTimeout.current = null;
        }
        // Clean up all measurement timers
        Array.from(measurementTimers.current.values()).forEach((timer) => {
          clearTimeout(timer);
        });
        measurementTimers.current.clear();
        tabContentRefs.current.clear();
      },
      [],
    );

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

    useEffect(() => {
      if (scrollViewRef.current && containerWidth > 0) {
        const contentIndex = getContentIndexFromTabIndex(activeIndex);
        if (contentIndex >= 0) {
          scrollViewRef.current.scrollTo({
            x: contentIndex * containerWidth,
            animated: !isScrolling.current,
          });
        }
      }
    }, [activeIndex, containerWidth, getContentIndexFromTabIndex]);

    const handleTabPress = useCallback(
      (tabIndex: number) => {
        if (
          tabIndex < 0 ||
          tabIndex >= tabs.length ||
          tabs[tabIndex]?.isDisabled
        ) {
          return;
        }

        const contentIndex = getContentIndexFromTabIndex(tabIndex);
        if (contentIndex < 0) return;

        const tabChanged = tabIndex !== activeIndex;
        setActiveIndex(tabIndex);

        if (!loadedTabs.has(tabIndex)) {
          if (process.env.JEST_WORKER_ID) {
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));
          } else {
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));

            if (loadTabTimeout.current) {
              clearTimeout(loadTabTimeout.current);
            }
            loadTabTimeout.current = setTimeout(() => {
              const tab = tabs[tabIndex];
              if (tab) measureTabHeight(tab.key);
              loadTabTimeout.current = null;
            }, 100);
          }
        }

        isProgrammaticScroll.current = true;

        if (scrollViewRef.current && containerWidth > 0) {
          scrollViewRef.current.scrollTo({
            x: contentIndex * containerWidth,
            animated: true,
          });
        }

        if (onChangeTab && tabChanged) {
          onChangeTab({
            i: tabIndex,
            ref: tabs[tabIndex]?.content || null,
          });
        }

        if (programmaticScrollTimeout.current) {
          clearTimeout(programmaticScrollTimeout.current);
        }
        programmaticScrollTimeout.current = setTimeout(() => {
          isProgrammaticScroll.current = false;
          programmaticScrollTimeout.current = null;
        }, 400);
      },
      [
        activeIndex,
        tabs,
        onChangeTab,
        containerWidth,
        getContentIndexFromTabIndex,
        loadedTabs,
        measureTabHeight,
      ],
    );

    const handleScroll = useCallback(
      (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isProgrammaticScroll.current) return;

        const { contentOffset } = scrollEvent.nativeEvent;
        if (containerWidth <= 0) return;

        const contentIndex = Math.round(contentOffset.x / containerWidth);
        const newTabIndex = getTabIndexFromContentIndex(contentIndex);

        if (newTabIndex >= 0 && newTabIndex !== activeIndex) {
          setActiveIndex(newTabIndex);
          setLoadedTabs((prev) => new Set(prev).add(newTabIndex));

          if (onChangeTab) {
            onChangeTab({
              i: newTabIndex,
              ref: tabs[newTabIndex]?.content || null,
            });
          }
        }
      },
      [
        activeIndex,
        containerWidth,
        onChangeTab,
        tabs,
        getTabIndexFromContentIndex,
      ],
    );

    const handleScrollBegin = useCallback(() => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      if (!isProgrammaticScroll.current) {
        isScrolling.current = true;
      }
    }, []);

    const handleScrollEnd = useCallback(() => {
      scrollTimeout.current = setTimeout(() => {
        isScrolling.current = false;

        // Only measure heights in autoHeight mode
        if (autoHeight) {
          const activeTab = tabs[activeIndex];
          if (activeTab && loadedTabs.has(activeIndex)) {
            // Update to the active tab's cached height immediately if available
            const cachedHeight = tabHeights.get(activeTab.key);
            if (cachedHeight && cachedHeight > 0) {
              setScrollViewHeight(cachedHeight);
            }
            // Then measure to ensure accuracy
            measureTabHeight(activeTab.key);
          }
        }
      }, 150);
    }, [
      activeIndex,
      loadedTabs,
      measureTabHeight,
      tabs,
      tabHeights,
      autoHeight,
    ]);

    const handleLayout = useCallback(
      (layoutEvent: { nativeEvent: { layout: { width: number } } }) => {
        const { width } = layoutEvent.nativeEvent.layout;
        setContainerWidth(width);
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        goToTabIndex: (tabIndex: number) => {
          if (
            tabIndex < 0 ||
            tabIndex >= tabs.length ||
            tabs[tabIndex]?.isDisabled
          ) {
            return;
          }

          const contentIndex = getContentIndexFromTabIndex(tabIndex);
          if (contentIndex < 0) return;

          const tabChanged = tabIndex !== activeIndex;
          setActiveIndex(tabIndex);

          if (!loadedTabs.has(tabIndex)) {
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));
          }

          isProgrammaticScroll.current = true;

          if (scrollViewRef.current && containerWidth > 0) {
            scrollViewRef.current.scrollTo({
              x: contentIndex * containerWidth,
              animated: true,
            });
          }

          if (onChangeTab && tabChanged) {
            onChangeTab({
              i: tabIndex,
              ref: tabs[tabIndex]?.content || null,
            });
          }

          if (goToTabTimeout.current) {
            clearTimeout(goToTabTimeout.current);
          }
          goToTabTimeout.current = setTimeout(() => {
            isProgrammaticScroll.current = false;
            goToTabTimeout.current = null;
          }, 400);
        },
        getCurrentIndex: () => activeIndex,
      }),
      [
        activeIndex,
        tabs,
        onChangeTab,
        containerWidth,
        getContentIndexFromTabIndex,
        loadedTabs,
      ],
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
      <Box testID={testID} {...boxProps}>
        {/* Render TabsBar */}
        <TabsBar {...tabBarPropsComputed} />

        {/* Horizontal ScrollView for tab contents with dynamic or fixed height */}
        <View
          style={tw.style(
            'mt-2',
            autoHeight && scrollViewHeight && scrollViewHeight > 0
              ? { height: scrollViewHeight, overflow: 'hidden' }
              : {},
          )}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollAnimationEnd={handleScrollEnd}
            onScrollBeginDrag={handleScrollBegin}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollBegin={handleScrollBegin}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            onLayout={handleLayout}
            style={tw.style('w-full')}
            decelerationRate="fast"
            testID={testID ? `${testID}-content` : undefined}
          >
            {enabledTabs.map((enabledTab) => (
              <View
                key={enabledTab.key}
                style={tw.style({ width: containerWidth })}
              >
                <View
                  style={tw.style(`px-4 ${tabsListContentTwClassName || ''}`)}
                  ref={(viewRef) => {
                    if (viewRef && autoHeight) {
                      tabContentRefs.current.set(enabledTab.key, viewRef);
                    }
                  }}
                  onLayout={(layoutEvent) => {
                    // Only measure heights in autoHeight mode
                    if (!autoHeight) return;

                    const { height } = layoutEvent.nativeEvent.layout;
                    if (height > 0) {
                      const currentHeight = tabHeights.get(enabledTab.key);

                      if (
                        !currentHeight ||
                        Math.abs(currentHeight - height) > 5
                      ) {
                        setTabHeights((prev) => {
                          const latestHeight = prev.get(enabledTab.key);
                          if (
                            latestHeight &&
                            Math.abs(latestHeight - height) <= 5
                          ) {
                            return prev;
                          }

                          const newHeights = new Map(prev);
                          newHeights.set(enabledTab.key, height);
                          return newHeights;
                        });

                        // Only update scrollViewHeight if we're on this tab and not actively scrolling
                        if (
                          enabledTab.originalIndex === activeIndex &&
                          tabContentRefs.current.has(enabledTab.key) &&
                          !isScrolling.current &&
                          !isProgrammaticScroll.current
                        ) {
                          setScrollViewHeight(height);
                        }
                      }
                    }
                  }}
                >
                  {loadedTabs.has(enabledTab.originalIndex) && shouldShowContent
                    ? enabledTab.content
                    : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
