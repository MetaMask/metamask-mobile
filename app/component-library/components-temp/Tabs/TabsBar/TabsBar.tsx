// Third party dependencies.
import React, { useRef } from 'react';
import { Animated, ScrollView } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import Tab from '../Tab';
import { TabsBarProps } from './TabsBar.types';
import { useTabsBarLayout } from '../hooks/useTabsBarLayout';

const TabsBar: React.FC<TabsBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  testID,
  twClassName,
  ...boxProps
}) => {
  const tw = useTailwind();

  const scrollViewRef = useRef<ScrollView>(null);
  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const underlineWidthAnimated = useRef(new Animated.Value(0)).current;

  const {
    isInitialized,
    scrollEnabled,
    handleContainerLayout,
    handleTabLayout,
  } = useTabsBarLayout({
    tabs,
    activeIndex,
    scrollViewRef,
    onAnimateToTab: (layout, isFirstTime) => {
      if (isFirstTime) {
        underlineAnimated.setValue(layout.x);
        underlineWidthAnimated.setValue(layout.width);
        return null;
      }
      return Animated.parallel([
        Animated.timing(underlineAnimated, {
          toValue: layout.x,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(underlineWidthAnimated, {
          toValue: layout.width,
          duration: 200,
          useNativeDriver: false,
        }),
      ]);
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
      twClassName={`relative overflow-hidden ${twClassName || ''}`}
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
              <Tab
                key={tab.key}
                label={tab.label}
                isActive={index === activeIndex}
                isDisabled={tab.isDisabled}
                onPress={() => handleTabPress(index)}
                onLayout={(layoutEvent) => handleTabLayout(index, layoutEvent)}
                testID={tab.testID ?? `${testID}-tab-${index}`}
              />
            ))}

            {activeIndex >= 0 && isInitialized && (
              <Animated.View
                style={tw.style('absolute bottom-0 h-0.5 bg-icon-default', {
                  width: underlineWidthAnimated,
                  transform: [{ translateX: underlineAnimated }],
                })}
              />
            )}
          </Box>
        </ScrollView>
      ) : (
        <Box twClassName="px-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="relative gap-6"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.key}
                label={tab.label}
                isActive={index === activeIndex}
                isDisabled={tab.isDisabled}
                onPress={() => handleTabPress(index)}
                onLayout={(layoutEvent) => handleTabLayout(index, layoutEvent)}
                testID={tab.testID ?? `${testID}-tab-${index}`}
              />
            ))}

            {activeIndex >= 0 && isInitialized && (
              <Animated.View
                style={tw.style('absolute bottom-0 h-0.5 bg-icon-default', {
                  width: underlineWidthAnimated,
                  transform: [{ translateX: underlineAnimated }],
                })}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TabsBar;
