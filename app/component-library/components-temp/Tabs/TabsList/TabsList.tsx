// Third party dependencies.
import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';

// External dependencies.
import { Box } from '@metamask/design-system-react-native';

// Internal dependencies.
import TabsBar from '../TabsBar';
import { TabsListProps, TabsListRef, TabItem } from './TabsList.types';

const TabsList = forwardRef<TabsListRef, TabsListProps>(
  (
    { children, initialActiveIndex = 0, onChangeTab, testID, ...boxProps },
    ref,
  ) => {
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

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
            };
          }
          return {
            key: `tab-${index}`,
            label: `Tab ${index + 1}`,
            content: child,
            isDisabled: false,
          };
        }) || [],
      [children],
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialActiveIndex, tabs]);

    const handleTabPress = useCallback(
      (index: number) => {
        const tab = tabs[index];
        if (!tab?.isDisabled && index !== activeIndex) {
          setActiveIndex(index);

          // Call the onChangeTab callback if provided
          if (onChangeTab) {
            onChangeTab({
              i: index,
              ref: tabs[index]?.content || null,
            });
          }
        }
      },
      [activeIndex, onChangeTab, tabs],
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        goToTabIndex: (tabIndex: number) => {
          if (tabIndex >= 0 && tabIndex < tabs.length) {
            const tab = tabs[tabIndex];
            if (!tab?.isDisabled) {
              setActiveIndex(tabIndex);
            }
          }
        },
        getCurrentIndex: () => activeIndex,
      }),
      [activeIndex, tabs],
    );

    const currentContent = tabs[activeIndex]?.content || null;

    const tabBarProps = {
      tabs,
      activeIndex,
      onTabPress: handleTabPress,
      testID: testID ? `${testID}-bar` : undefined,
    };

    return (
      <Box twClassName="flex-1" testID={testID} {...boxProps}>
        {/* Render default TabsBar */}
        <TabsBar {...tabBarProps} />

        {/* Tab content with dynamic height */}
        <Box twClassName="flex-1 mt-2">{currentContent}</Box>
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
