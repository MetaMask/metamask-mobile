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

        if (
          newIndex >= 0 &&
          newIndex < tabs.length &&
          !tabs[newIndex]?.isDisabled &&
          newIndex !== activeIndex
        ) {
          setActiveIndex(newIndex);

          // Ensure the tab is loaded
          setLoadedTabs((prev) => new Set(prev).add(newIndex));

          // Call the onChangeTab callback if provided
          if (onChangeTab) {
            onChangeTab({
              i: newIndex,
              ref: tabs[newIndex]?.content || null,
            });
          }
        }
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

    const handleScrollEnd = useCallback(() => {
      // Reset scrolling flag after a short delay
      scrollTimeout.current = setTimeout(() => {
        isScrolling.current = false;
      }, 150);
    }, []);

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
      // TabsList activeIndex changed
    }, [activeIndex]);

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
          onScrollAnimationEnd={handleScrollEnd}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollBegin={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={8}
          onLayout={handleLayout}
          style={tw.style('flex-1 mt-2')}
          decelerationRate="fast"
        >
          {tabs.map((tab, index) => (
            <Box
              key={tab.key}
              style={tw.style('flex-1', { width: containerWidth })}
            >
              {loadedTabs.has(index) ? tab.content : null}
            </Box>
          ))}
        </ScrollView>
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
