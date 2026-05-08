import React, { useImperativeHandle, forwardRef, useMemo } from 'react';

import { Box } from '@metamask/design-system-react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import TabsIconBar from '../TabsIconBar/TabsIconBar';
import type { IconName } from '../../../components/Icons/Icon/Icon.types';
import {
  TabsIconListProps,
  TabsIconListRef,
  TabsIconItem,
} from './TabsIconList.types';
import { useTabsList } from '../hooks/useTabsList';

const TabsIconList = forwardRef<TabsIconListRef, TabsIconListProps>(
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
    const tabs: TabsIconItem[] = useMemo(
      () =>
        React.Children.toArray(children)
          .filter((child) => React.isValidElement(child))
          .map((child, index) => {
            const props = (child as React.ReactElement).props as {
              tabLabel?: string;
              tabIcon?: IconName;
              isDisabled?: boolean;
              testID?: string;
              keepMounted?: boolean;
            };
            const tabLabel = props.tabLabel || `Tab ${index + 1}`;
            const isDisabled = props.isDisabled || false;
            return {
              key:
                (child as React.ReactElement).key?.toString() || `tab-${index}`,
              label: tabLabel,
              iconName: props.tabIcon as IconName,
              content: child,
              isDisabled,
              isLoaded: false,
              testID: props.testID,
              keepMounted: props.keepMounted ?? true,
            };
          }),
      [children],
    );

    const { activeIndex, loadedTabs, handleTabPress, swipeGesture } =
      useTabsList({ tabs, initialActiveIndex, onChangeTab });

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
        <TabsIconBar {...tabBarPropsComputed} />

        <GestureDetector gesture={swipeGesture}>
          <Box
            twClassName={`flex-1 mt-2 px-4 ${tabsListContentTwClassName || ''}`}
            testID={testID ? `${testID}-content` : undefined}
          >
            {tabs.map((tab, index) => {
              const isActive = index === activeIndex;
              const isLoaded = loadedTabs.has(index);

              if (!isLoaded) return null;
              if (!isActive && !tab.keepMounted) return null;

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

TabsIconList.displayName = 'TabsIconList';

export default TabsIconList;
