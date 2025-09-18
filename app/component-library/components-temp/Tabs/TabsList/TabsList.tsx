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
    const scrollViewRef = useRef<ScrollView>(null);
    const isScrolling = useRef(false);
    const isProgrammaticScroll = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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

    // Initialize loaded tabs with active tab
    useEffect(() => {
      if (activeIndex >= 0 && activeIndex < tabs.length) {
        setLoadedTabs((prev) => new Set(prev).add(activeIndex));
      }
    }, [activeIndex, tabs.length]);

    // Lazy load non-disabled tabs in background
    useEffect(() => {
      const loadBackgroundTabs = () => {
        const newLoadedTabs = new Set(loadedTabs);

        // Load all non-disabled tabs
        tabs.forEach((tab, index) => {
          if (!tab.isDisabled && !newLoadedTabs.has(index)) {
            newLoadedTabs.add(index);
          }
        });

        if (newLoadedTabs.size !== loadedTabs.size) {
          setLoadedTabs(newLoadedTabs);
        }
      };

      // Use a small delay to prioritize the active tab rendering first
      const timer = setTimeout(loadBackgroundTabs, 100);
      return () => clearTimeout(timer);
    }, [tabs, loadedTabs]);

    // Update active index when initialActiveIndex or tabs change
    useEffect(() => {
      // Store the current active tab key for preservation
      const currentActiveTabKey = tabs[activeIndex]?.key;

      // First, try to preserve the current active tab by key when tabs array changes
      if (currentActiveTabKey && tabs.length > 0) {
        // Try to find the current active tab by key in the new tabs array
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

    // Scroll to active tab when activeIndex changes
    useEffect(() => {
      if (scrollViewRef.current && activeIndex >= 0 && containerWidth > 0) {
        const targetX = activeIndex * containerWidth;
        scrollViewRef.current.scrollTo({
          x: targetX,
          animated: !isScrolling.current, // Don't animate if user is currently scrolling
        });
      }
    }, [activeIndex, containerWidth]);

    // Calculate scroll boundaries to prevent scrolling to disabled tabs
    const scrollBoundaries = useMemo(() => {
      const enabledIndices = tabs
        .map((tab, index) => (!tab.isDisabled ? index : -1))
        .filter((index) => index !== -1);

      if (enabledIndices.length === 0) {
        return { minX: 0, maxX: 0, minIndex: 0, maxIndex: 0 };
      }

      const minIndex = Math.min(...enabledIndices);
      const maxIndex = Math.max(...enabledIndices);

      return {
        minX: minIndex * containerWidth,
        maxX: maxIndex * containerWidth,
        minIndex,
        maxIndex,
      };
    }, [tabs, containerWidth]);

    const handleTabPress = useCallback(
      (index: number) => {
        const tab = tabs[index];
        if (!tab?.isDisabled && index !== activeIndex) {
          // Update activeIndex immediately for TabsBar animation
          setActiveIndex(index);

          // Ensure the tab is loaded
          setLoadedTabs((prev) => new Set(prev).add(index));

          // Set programmatic scroll flag AFTER state update
          isProgrammaticScroll.current = true;

          // Scroll to the correct position
          if (scrollViewRef.current && containerWidth > 0) {
            const targetX = index * containerWidth;
            scrollViewRef.current.scrollTo({
              x: targetX,
              animated: true,
            });
          }

          // Call the onChangeTab callback if provided
          if (onChangeTab) {
            onChangeTab({
              i: index,
              ref: tabs[index]?.content || null,
            });
          }

          // Reset programmatic scroll flag after animation
          setTimeout(() => {
            isProgrammaticScroll.current = false;
          }, 400);
        }
      },
      [activeIndex, onChangeTab, tabs, containerWidth],
    );

    const handleScroll = useCallback(
      (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Don't process scroll events during programmatic scrolling (tab clicks)
        if (isProgrammaticScroll.current) return;

        const { contentOffset } = scrollEvent.nativeEvent;

        // Avoid division by zero and ensure containerWidth is set
        if (containerWidth <= 0) return;

        const newIndex = Math.round(contentOffset.x / containerWidth);

        console.log('🌊 handleScroll processing:', {
          newIndex,
          currentActiveIndex: activeIndex,
          isEnabled:
            newIndex >= 0 && newIndex < tabs.length
              ? !tabs[newIndex]?.isDisabled
              : false,
          willChange: newIndex !== activeIndex,
          contentOffset: contentOffset.x,
        });

        // Handle scrolling more intelligently:
        // - Update activeIndex for enabled tabs normally
        // - For disabled tabs, find the nearest enabled tab in scroll direction
        if (
          newIndex >= 0 &&
          newIndex < tabs.length &&
          newIndex !== activeIndex
        ) {
          let targetIndex = newIndex;

          // If target is disabled, find nearest enabled tab
          if (tabs[newIndex]?.isDisabled) {
            console.log(
              '🚫 Scrolled to disabled tab, finding nearest enabled:',
              newIndex,
            );

            // Determine scroll direction
            const isScrollingRight = newIndex > activeIndex;

            // Search in scroll direction first, then opposite direction
            if (isScrollingRight) {
              // Look right first
              for (let i = newIndex + 1; i < tabs.length; i++) {
                if (!tabs[i]?.isDisabled) {
                  targetIndex = i;
                  break;
                }
              }
              // If not found, look left
              if (targetIndex === newIndex) {
                for (let i = newIndex - 1; i >= 0; i--) {
                  if (!tabs[i]?.isDisabled) {
                    targetIndex = i;
                    break;
                  }
                }
              }
            } else {
              // Look left first
              for (let i = newIndex - 1; i >= 0; i--) {
                if (!tabs[i]?.isDisabled) {
                  targetIndex = i;
                  break;
                }
              }
              // If not found, look right
              if (targetIndex === newIndex) {
                for (let i = newIndex + 1; i < tabs.length; i++) {
                  if (!tabs[i]?.isDisabled) {
                    targetIndex = i;
                    break;
                  }
                }
              }
            }

            console.log('🎯 Found nearest enabled tab:', {
              from: newIndex,
              to: targetIndex,
            });
          }

          // Only update if we found a valid enabled tab and it's different from current
          if (targetIndex !== activeIndex && !tabs[targetIndex]?.isDisabled) {
            console.log('🔄 handleScroll updating activeIndex:', {
              from: activeIndex,
              to: targetIndex,
              wasDisabled: tabs[newIndex]?.isDisabled,
            });

            setActiveIndex(targetIndex);

            // Ensure the tab is loaded
            setLoadedTabs((prev) => new Set(prev).add(targetIndex));

            // Call the onChangeTab callback if provided
            if (onChangeTab) {
              onChangeTab({
                i: targetIndex,
                ref: tabs[targetIndex]?.content || null,
              });
            }
          } else if (
            tabs[newIndex]?.isDisabled &&
            targetIndex === activeIndex &&
            !isProgrammaticScroll.current
          ) {
            // If scrolling to disabled tab would keep us on same tab,
            // use a debounced approach to prevent getting stuck
            console.log('🔒 Preventing scroll to disabled tab boundary:', {
              newIndex,
              targetIndex,
              activeIndex,
            });

            // Clear any existing timeout to prevent multiple rapid corrections
            if (scrollTimeout.current) {
              clearTimeout(scrollTimeout.current);
            }

            // Debounce the correction to prevent rapid fire
            scrollTimeout.current = setTimeout(() => {
              if (scrollViewRef.current && !isProgrammaticScroll.current) {
                isProgrammaticScroll.current = true;
                const currentX = activeIndex * containerWidth;
                scrollViewRef.current.scrollTo({
                  x: currentX,
                  animated: true,
                });
                // Reset flag after scroll
                setTimeout(() => {
                  isProgrammaticScroll.current = false;
                }, 400);
              }
            }, 100); // Small delay to debounce
          }
        }

        // Remove complex boundary enforcement - let the simpler disabled tab logic handle it
      },
      [activeIndex, containerWidth, onChangeTab, tabs],
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

    const handleScrollEnd = useCallback(
      (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Don't process if we're in the middle of a programmatic scroll
        if (isProgrammaticScroll.current) {
          scrollTimeout.current = setTimeout(() => {
            isScrolling.current = false;
          }, 150);
          return;
        }

        const { contentOffset } = scrollEvent.nativeEvent;

        // Avoid division by zero and ensure containerWidth is set
        if (containerWidth <= 0) {
          scrollTimeout.current = setTimeout(() => {
            isScrolling.current = false;
          }, 150);
          return;
        }

        const rawIndex = Math.round(contentOffset.x / containerWidth);

        // Check if we've landed on a disabled tab
        console.log('🔍 handleScrollEnd check:', {
          rawIndex,
          currentActiveIndex: activeIndex,
          isDisabled: tabs[rawIndex]?.isDisabled,
          containerWidth,
          contentOffset: contentOffset.x,
          tabLabel: tabs[rawIndex]?.label,
          willRedirect:
            tabs[rawIndex]?.isDisabled &&
            rawIndex >= 0 &&
            rawIndex < tabs.length,
        });

        // DISABLED: Redirection logic causes ping-pong effect
        // Let ScrollView handle paging naturally, disabled tabs will just be empty
        console.log(
          '🔍 handleScrollEnd - redirection disabled to prevent ping-pong effect',
        );

        // Reset scrolling flag after a short delay
        scrollTimeout.current = setTimeout(() => {
          isScrolling.current = false;
        }, 150);
      },
      [activeIndex, containerWidth, onChangeTab, tabs],
    );

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
          if (tabIndex >= 0 && tabIndex < tabs.length) {
            const tab = tabs[tabIndex];
            if (!tab?.isDisabled && tabIndex !== activeIndex) {
              // Update activeIndex immediately for TabsBar animation
              setActiveIndex(tabIndex);

              // Ensure the tab is loaded
              setLoadedTabs((prev) => new Set(prev).add(tabIndex));

              // Set programmatic scroll flag AFTER state update
              isProgrammaticScroll.current = true;

              // Scroll to the correct position
              if (scrollViewRef.current && containerWidth > 0) {
                const targetX = tabIndex * containerWidth;
                scrollViewRef.current.scrollTo({
                  x: targetX,
                  animated: true,
                });
              }

              // Call the onChangeTab callback if provided
              if (onChangeTab) {
                onChangeTab({
                  i: tabIndex,
                  ref: tabs[tabIndex]?.content || null,
                });
              }

              // Reset programmatic scroll flag after animation
              setTimeout(() => {
                isProgrammaticScroll.current = false;
              }, 400);
            }
          }
        },
        getCurrentIndex: () => activeIndex,
      }),
      [activeIndex, tabs, onChangeTab, containerWidth],
    );

    // Debug: Log activeIndex changes
    useEffect(() => {
      console.log('🔄 TabsList activeIndex changed:', {
        activeIndex,
        hasAnyEnabledTabs,
        shouldShowContent,
        loadedTabsArray: Array.from(loadedTabs),
        totalTabs: tabs.length,
      });
    }, [
      activeIndex,
      hasAnyEnabledTabs,
      shouldShowContent,
      loadedTabs,
      tabs.length,
    ]);

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
      <Box twClassName="flex-1" testID={testID} {...boxProps}>
        {/* Render TabsBar */}
        <TabsBar {...tabBarProps} />

        {/* Horizontal ScrollView for tab contents */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollBegin={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          onLayout={handleLayout}
          style={tw.style('flex-1 mt-2')}
          decelerationRate="fast"
        >
          {tabs.map((tab, index) => {
            // Only show content for the currently active tab
            const showContent =
              index === activeIndex &&
              loadedTabs.has(index) &&
              shouldShowContent &&
              !tab.isDisabled;

            console.log(`📱 Tab ${index} content render:`, {
              tabLabel: tab.label,
              isActiveTab: index === activeIndex,
              isLoaded: loadedTabs.has(index),
              shouldShowContent,
              isDisabled: tab.isDisabled,
              showContent,
              activeIndex,
              containerWidth,
              hasAnyEnabledTabs,
            });

            // For disabled tabs, render a non-scrollable placeholder
            if (tab.isDisabled) {
              return (
                <Box
                  key={tab.key}
                  style={tw.style('flex-1', { width: containerWidth })}
                  pointerEvents="none"
                >
                  {console.log(
                    `🚫 Rendering disabled placeholder for tab ${index}: ${tab.label}`,
                  )}
                  {/* Empty placeholder that can't be interacted with */}
                </Box>
              );
            }

            return (
              <Box
                key={tab.key}
                style={tw.style('flex-1', { width: containerWidth })}
              >
                {showContent ? (
                  <>
                    {console.log(
                      `🎯 Actually rendering content for tab ${index}: ${tab.label}`,
                    )}
                    {tab.content}
                  </>
                ) : (
                  <>
                    {console.log(
                      `❌ NOT rendering content for tab ${index}: ${tab.label}`,
                    )}
                    {null}
                  </>
                )}
              </Box>
            );
          })}
        </ScrollView>
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
