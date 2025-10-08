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
    {
      children,
      initialActiveIndex = 0,
      onChangeTab,
      testID,
      tabsBarTwClassName,
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
    const scrollViewRef = useRef<ScrollView>(null);
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

    // Load tab content on-demand when tab becomes active for the first time
    useEffect(() => {
      if (activeIndex >= 0 && activeIndex < tabs.length) {
        setLoadedTabs((prev) => {
          // Only update if the tab isn't already loaded
          if (!prev.has(activeIndex)) {
            return new Set(prev).add(activeIndex);
          }
          return prev;
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
      },
      [],
    );

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

        // Only update state and call callback if the tab actually changed
        const tabChanged = tabIndex !== activeIndex;

        // Update activeIndex immediately for TabsBar animation
        setActiveIndex(tabIndex);

        // Ensure the tab is loaded
        if (!loadedTabs.has(tabIndex)) {
          // Synchronous updates for tests
          if (process.env.JEST_WORKER_ID) {
            setLoadedTabs((prev) => new Set(prev).add(tabIndex));
          } else {
            if (loadTabTimeout.current) {
              clearTimeout(loadTabTimeout.current);
            }
            loadTabTimeout.current = setTimeout(() => {
              setLoadedTabs((prev) => new Set(prev).add(tabIndex));
              loadTabTimeout.current = null;
            }, 10); // Brief delay for smooth loading
          }
        }

        // Mark as programmatic scroll
        isProgrammaticScroll.current = true;

        // Scroll to the content index, not the tab index
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

        // Reset programmatic scroll flag
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
          // Update activeIndex immediately to trigger TabsBar animation alongside content scroll
          // This matches the behavior of tab clicks
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
      // Reset scrolling flag
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

          // Mark as programmatic scroll
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

          // Reset programmatic scroll flag
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
        twClassName: tabsBarTwClassName,
      }),
      [tabs, activeIndex, handleTabPress, testID, tabsBarTwClassName],
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
          scrollEventThrottle={16}
          onLayout={handleLayout}
          style={tw.style('flex-1 mt-2')}
          decelerationRate="fast"
          testID={testID ? `${testID}-content` : undefined}
        >
          {enabledTabs.map((enabledTab) => (
            <Box
              key={enabledTab.key}
              style={tw.style('flex-1 px-4', { width: containerWidth })}
            >
              {loadedTabs.has(enabledTab.originalIndex) && shouldShowContent
                ? enabledTab.content
                : null}
            </Box>
          ))}
        </ScrollView>
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
