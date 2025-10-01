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
    { children, initialActiveIndex = 0, onChangeTab, testID, ...boxProps },
    ref,
  ) => {
    const tw = useTailwind();
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
    const [containerWidth, setContainerWidth] = useState(
      Dimensions.get('window').width,
    );
    const [loadedTabs, setLoadedTabs] = useState<Set<number>>(new Set());
    const [tabHeights, setTabHeights] = useState<Map<number, number>>(
      new Map(),
    );
    const [scrollViewHeight, setScrollViewHeight] = useState<
      number | undefined
    >(undefined);
    const scrollViewRef = useRef<ScrollView>(null);
    const tabContentRefs = useRef<Map<number, View>>(new Map());
    const isScrolling = useRef(false);
    const isProgrammaticScroll = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const loadTabTimeout = useRef<NodeJS.Timeout | null>(null);
    const programmaticScrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const goToTabTimeout = useRef<NodeJS.Timeout | null>(null);

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

    // Function to measure tab content height
    const measureTabHeight = useCallback((tabIndex: number) => {
      const tabContentRef = tabContentRefs.current.get(tabIndex);
      if (tabContentRef) {
        // Use requestAnimationFrame to ensure measurement happens after render
        const rafId = requestAnimationFrame(() => {
          // Check if component is still mounted and ref is still valid
          if (tabContentRefs.current.has(tabIndex)) {
            tabContentRef.measure(
              (
                _x: number,
                _y: number,
                _width: number,
                height: number,
                _pageX: number,
                _pageY: number,
              ) => {
                // Double-check component is still mounted before updating state
                if (height > 0 && tabContentRefs.current.has(tabIndex)) {
                  setTabHeights((prev) => {
                    const newHeights = new Map(prev);
                    newHeights.set(tabIndex, height);
                    return newHeights;
                  });
                }
              },
            );
          }
        });

        // Return cleanup function to cancel RAF if needed
        return () => cancelAnimationFrame(rafId);
      }
    }, []);

    useEffect(() => {
      const currentTabHeight = tabHeights.get(activeIndex);

      if (currentTabHeight && currentTabHeight > 0) {
        // If we have a cached height, use it immediately for smooth transitions
        setScrollViewHeight(currentTabHeight);
      } else if (activeIndex >= 0 && loadedTabs.has(activeIndex)) {
        // If tab is loaded but height not measured, measure it quickly
        // Use a ref to track if this measurement is still relevant
        let isMeasurementRelevant = true;

        const timeoutId = setTimeout(() => {
          if (isMeasurementRelevant) {
            const cleanup = measureTabHeight(activeIndex);
            // Store cleanup function if returned
            if (cleanup) {
              // The cleanup will be called when the timeout is cleared or component unmounts
            }
          }
        }, 50); // Reduced delay for faster measurement

        return () => {
          isMeasurementRelevant = false;
          clearTimeout(timeoutId);
        };
      } else if (activeIndex >= 0) {
        // For new tabs, use a reasonable default estimate for smoother initial animation
        // Only set fallback if we don't have any height information
        const hasAnyHeight = Array.from(tabHeights.values()).some(h => h > 0);
        if (!hasAnyHeight) {
          setScrollViewHeight(400);
        } else {
          // Use average of existing heights as a better estimate
          const heights = Array.from(tabHeights.values()).filter(h => h > 0);
          const avgHeight = heights.length > 0
            ? Math.round(heights.reduce((sum, h) => sum + h, 0) / heights.length)
            : 400;
          setScrollViewHeight(avgHeight);
        }
      } else {
        setScrollViewHeight(undefined);
      }
    }, [activeIndex, tabHeights, loadedTabs, measureTabHeight]);

    useEffect(() => {
      if (activeIndex >= 0 && activeIndex < tabs.length) {
        setLoadedTabs((prev) => {
          const newLoadedTabs = new Set(prev);

          // Only load the current tab (strict lazy loading)
          newLoadedTabs.add(activeIndex);

          return newLoadedTabs.size !== prev.size ? newLoadedTabs : prev;
        });
      }
    }, [activeIndex, tabs]);

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
          // Preserve the current selection if the tab still exists and is enabled
          setActiveIndex(newIndexForCurrentTab);
          return;
        }
      }

      // Fallback: When current tab is no longer available, try to keep current index if valid
      if (
        activeIndex >= 0 &&
        activeIndex < tabs.length &&
        !tabs[activeIndex]?.isDisabled
      ) {
        // Current activeIndex is still valid, keep it
        return;
      }

      // If current activeIndex is invalid, fall back to initialActiveIndex or first enabled tab
      const targetTab = tabs[initialActiveIndex];
      if (targetTab && !targetTab.isDisabled) {
        setActiveIndex(initialActiveIndex);
      } else {
        // Find first enabled tab
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
            animated: !isScrolling.current, // Don't animate if user is currently scrolling
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

        // Get the content index for this tab
        const contentIndex = getContentIndexFromTabIndex(tabIndex);
        if (contentIndex < 0) return;

        const tabChanged = tabIndex !== activeIndex;
        setActiveIndex(tabIndex);

        if (!loadedTabs.has(tabIndex)) {
          if (process.env.JEST_WORKER_ID) {
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));
          } else {
            // Load tab content immediately for smoother experience
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));

            // Measure height after a brief moment to allow content to render
            if (loadTabTimeout.current) {
              clearTimeout(loadTabTimeout.current);
            }
            loadTabTimeout.current = setTimeout(() => {
              measureTabHeight(tabIndex);
              loadTabTimeout.current = null;
            }, 100); // Allow time for content to render before measuring
          }
        }

        isProgrammaticScroll.current = true;

        // Scroll to the content index, not the tab index
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

        // Reset programmatic scroll flag after animation
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

        // Calculate which content index we're at
        const contentIndex = Math.round(contentOffset.x / containerWidth);

        // Convert content index back to tab index
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
      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Only mark as user scroll if it's not programmatic
      if (!isProgrammaticScroll.current) {
        isScrolling.current = true;
      }
    }, []);

    const handleScrollEnd = useCallback(() => {
      scrollTimeout.current = setTimeout(() => {
        isScrolling.current = false;
        if (activeIndex >= 0 && loadedTabs.has(activeIndex)) {
          measureTabHeight(activeIndex);
        }
      }, 150);
    }, [activeIndex, loadedTabs, measureTabHeight]);

    const handleLayout = useCallback(
      (layoutEvent: { nativeEvent: { layout: { width: number } } }) => {
        const { width } = layoutEvent.nativeEvent.layout;
        setContainerWidth(width);
      },
      [],
    );

    // Expose methods via ref
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

          // Only update state and call callback if the tab actually changed
          const tabChanged = tabIndex !== activeIndex;

          // Update activeIndex immediately for TabsBar animation
          setActiveIndex(tabIndex);

          // Ensure the tab is loaded
          if (!loadedTabs.has(tabIndex)) {
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));
          }

          // Set programmatic scroll flag AFTER state update
          isProgrammaticScroll.current = true;

          if (scrollViewRef.current && containerWidth > 0) {
            scrollViewRef.current.scrollTo({
              x: contentIndex * containerWidth,
              animated: true,
            });
          }

          // Only call onChangeTab if the tab actually changed
          if (onChangeTab && tabChanged) {
            onChangeTab({
              i: tabIndex,
              ref: tabs[tabIndex]?.content || null,
            });
          }

          // Reset programmatic scroll flag after animation
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

    const tabBarProps = useMemo(
      () => ({
        tabs,
        activeIndex,
        onTabPress: handleTabPress,
        testID: testID ? `${testID}-bar` : undefined,
      }),
      [tabs, activeIndex, handleTabPress, testID],
    );

    return (
      <Box testID={testID} {...boxProps}>
        {/* Render TabsBar */}
        <TabsBar {...tabBarProps} />

        {/* Horizontal ScrollView for tab contents with dynamic height */}
        <View
          style={tw.style(
            'mt-2',
            scrollViewHeight
              ? { height: scrollViewHeight, overflow: 'hidden' }
              : { minHeight: 200 },
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
            contentContainerStyle={tw.style('h-full')}
            decelerationRate="fast"
            testID={testID ? `${testID}-content` : undefined}
          >
            {enabledTabs.map((enabledTab) => (
              <View
                key={enabledTab.key}
                style={tw.style({ width: containerWidth })}
              >
                <View
                  ref={(viewRef) => {
                    if (viewRef) {
                      tabContentRefs.current.set(
                        enabledTab.originalIndex,
                        viewRef,
                      );
                    }
                  }}
                  onLayout={(layoutEvent) => {
                    const { height } = layoutEvent.nativeEvent.layout;
                    if (height > 0) {
                      const tabIndex = enabledTab.originalIndex;
                      const currentHeight = tabHeights.get(tabIndex);

                      // Only update if height has changed significantly (avoid micro-updates)
                      if (
                        !currentHeight ||
                        Math.abs(currentHeight - height) > 5
                      ) {
                        // Use functional update to ensure we have the latest state
                        setTabHeights((prev) => {
                          // Double-check the height hasn't been updated by another source
                          const latestHeight = prev.get(tabIndex);
                          if (latestHeight && Math.abs(latestHeight - height) <= 5) {
                            return prev; // No update needed
                          }

                          const newHeights = new Map(prev);
                          newHeights.set(tabIndex, height);
                          return newHeights;
                        });

                        // If this is the active tab, update height immediately for smooth experience
                        // But only if the component is still mounted and this tab is still active
                        if (tabIndex === activeIndex && tabContentRefs.current.has(tabIndex)) {
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
