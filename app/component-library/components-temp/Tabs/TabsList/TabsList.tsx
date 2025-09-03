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
    { children, initialPage = 0, onChangeTab, locked = false, style, testID },
    ref,
  ) => {
    const tw = useTailwind();
    const [activeIndex, setActiveIndex] = useState(initialPage);

    // Extract tab items from children
    const tabs: TabItem[] = useMemo(
      () =>
        React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            const tabLabel =
              (child.props as { tabLabel?: string })?.tabLabel ||
              `Tab ${index + 1}`;
            return {
              key: child.key?.toString() || `tab-${index}`,
              label: tabLabel,
              content: child,
            };
          }
          return {
            key: `tab-${index}`,
            label: `Tab ${index + 1}`,
            content: child,
          };
        }) || [],
      [children],
    );

    // Update active index when initialPage changes
    useEffect(() => {
      setActiveIndex(initialPage);
    }, [initialPage]);

    const handleTabPress = useCallback(
      (index: number) => {
        if (!locked && index !== activeIndex) {
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
      [activeIndex, locked, onChangeTab, tabs],
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        goToPage: (pageNumber: number) => {
          if (pageNumber >= 0 && pageNumber < tabs.length) {
            handleTabPress(pageNumber);
          }
        },
        getCurrentIndex: () => activeIndex,
      }),
      [handleTabPress, activeIndex, tabs.length],
    );

    const currentContent = tabs[activeIndex]?.content || null;

    const tabBarProps = {
      tabs,
      activeIndex,
      onTabPress: handleTabPress,
      locked,
      testID: testID ? `${testID}-bar` : undefined,
    };

    return (
      <Box style={tw.style('flex-1', style)} testID={testID}>
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
