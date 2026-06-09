// Third party dependencies.
import React, { useRef, useState } from 'react';
import { Animated, ScrollView, LayoutChangeEvent } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import TabsIconTab from '../TabsIconTab/TabsIconTab';
import { TabsIconBarProps } from './TabsIconBar.types';
import { useTabsBarLayout } from '../hooks/useTabsBarLayout';

const TabsIconBar: React.FC<TabsIconBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  testID,
  twClassName,
  fillWidth = false,
  collapseAnim,
  collapseHeightOffset,
  ...boxProps
}) => {
  const tw = useTailwind();

  const scrollViewRef = useRef<ScrollView>(null);
  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const [underlineWidth, setUnderlineWidth] = useState(0);

  // Height collapse animation — icon tabs always have a border-b row
  const [tabRowHeight, setTabRowHeight] = useState(0);
  const collapsedHeight =
    collapseHeightOffset !== undefined
      ? Math.max(0, tabRowHeight - collapseHeightOffset)
      : 0;
  const animatedHeight =
    collapseAnim && tabRowHeight > 0
      ? collapseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [tabRowHeight, collapsedHeight],
        })
      : undefined;

  const {
    isInitialized,
    scrollEnabled,
    handleContainerLayout,
    handleTabLayout,
  } = useTabsBarLayout({
    tabs,
    activeIndex,
    fillWidth,
    scrollAnimated: false,
    scrollViewRef,
    onAnimateToTab: (layout, isFirstTime) => {
      // Icon tabs: underline is 75% of the tab width, centered
      const targetWidth = layout.width * 0.75;
      const targetX = layout.x + layout.width * 0.125;

      setUnderlineWidth(targetWidth);

      if (isFirstTime) {
        underlineAnimated.setValue(targetX);
        return null;
      }

      return Animated.timing(underlineAnimated, {
        toValue: targetX,
        duration: 200,
        useNativeDriver: true,
      });
    },
  });

  const handleTabPress = (index: number) => {
    const tab = tabs[index];
    if (!tab?.isDisabled) {
      onTabPress(index);
    }
  };

  return (
    <Box
      twClassName={`relative overflow-hidden border-b border-border-muted ${twClassName || ''}`}
      testID={testID}
      onLayout={handleContainerLayout as (layoutEvent: unknown) => void}
      {...boxProps}
    >
      {scrollEnabled ? (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw.style('flex-grow-0')}
          contentContainerStyle={tw.style('flex-row px-4')}
          scrollsToTop={false}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="relative gap-6"
          >
            {tabs.map((tab, index) => (
              <TabsIconTab
                key={tab.key}
                label={tab.label}
                iconName={tab.iconName}
                isActive={index === activeIndex}
                isDisabled={tab.isDisabled}
                onPress={() => handleTabPress(index)}
                onLayout={(layoutEvent) => handleTabLayout(index, layoutEvent)}
                testID={tab.testID ?? `${testID}-tab-${index}`}
                style={tw.style('py-2')}
              />
            ))}

            {activeIndex >= 0 && isInitialized && (
              <Animated.View
                style={tw.style(
                  'absolute -bottom-2px h-1 bg-icon-default z-1',
                  {
                    width: underlineWidth,
                    transform: [{ translateX: underlineAnimated }],
                  },
                )}
              />
            )}
          </Box>
        </ScrollView>
      ) : (
        <Animated.View
          onLayout={({
            nativeEvent,
          }: {
            nativeEvent: LayoutChangeEvent['nativeEvent'];
          }) => {
            if (tabRowHeight === 0 && nativeEvent.layout.height > 0) {
              setTabRowHeight(nativeEvent.layout.height);
            }
          }}
          style={[
            tw.style(
              `relative ${fillWidth ? 'flex-row items-center' : 'px-4 gap-6 flex-row items-center relative'} ${animatedHeight !== undefined ? 'overflow-hidden' : ''}`,
            ),
            animatedHeight !== undefined
              ? { height: animatedHeight }
              : undefined,
          ]}
        >
          {tabs.map((tab, index) => (
            <TabsIconTab
              key={tab.key}
              label={tab.label}
              iconName={tab.iconName}
              isActive={index === activeIndex}
              isDisabled={tab.isDisabled}
              onPress={() => handleTabPress(index)}
              onLayout={(layoutEvent) => handleTabLayout(index, layoutEvent)}
              testID={tab.testID ?? `${testID}-tab-${index}`}
              shouldFillWidth={fillWidth}
            />
          ))}

          {activeIndex >= 0 && isInitialized && (
            <Animated.View
              style={tw.style('absolute -bottom-2px h-1 bg-icon-default z-1', {
                width: underlineWidth,
                transform: [{ translateX: underlineAnimated }],
              })}
            />
          )}
        </Animated.View>
      )}
    </Box>
  );
};

export default TabsIconBar;
