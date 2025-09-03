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

    // Update active index when initialActiveIndex changes
    useEffect(() => {
      // If the initial active index points to a disabled tab, find the first enabled tab
      const targetTab = tabs[initialActiveIndex];
      if (targetTab?.isDisabled) {
        const firstEnabledIndex = tabs.findIndex((tab) => !tab.isDisabled);
        // If no enabled tabs exist, set to -1 to indicate no active tab
        setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : -1);
      } else {
        setActiveIndex(initialActiveIndex);
      }
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
        <Box twClassName="flex-1">{currentContent}</Box>
      </Box>
    );
  },
);

TabsList.displayName = 'TabsList';

export default TabsList;
