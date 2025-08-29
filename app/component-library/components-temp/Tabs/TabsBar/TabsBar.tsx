// Third party dependencies.
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, LayoutChangeEvent } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import Tab from '../Tab';
import { TabsBarProps } from '../Tabs.types';

const TabsBar: React.FC<TabsBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  scrollEnabled = true,
  style,
  tabStyle,
  textStyle,
  underlineStyle,
  locked = false,
  testID,
}) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<ScrollView>(null);

  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const underlineWidthAnimated = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const isInitialized = useRef(false);

  // Animate underline when active tab changes
  useEffect(() => {
    const activeTabLayout = tabLayouts.current[activeIndex];
    if (activeTabLayout) {
      if (!isInitialized.current) {
        // Set initial position without animation on first render
        underlineAnimated.setValue(activeTabLayout.x);
        underlineWidthAnimated.setValue(activeTabLayout.width);
        isInitialized.current = true;
      } else {
        // Animate for subsequent tab changes
        Animated.parallel([
          Animated.spring(underlineAnimated, {
            toValue: activeTabLayout.x,
            useNativeDriver: false,
            tension: 300,
            friction: 30,
          }),
          Animated.spring(underlineWidthAnimated, {
            toValue: activeTabLayout.width,
            useNativeDriver: false,
            tension: 300,
            friction: 30,
          }),
        ]).start();
      }

      // Scroll to active tab if needed
      if (scrollEnabled && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, activeTabLayout.x - 50),
          animated: true,
        });
      }
    }
  }, [activeIndex, scrollEnabled, underlineAnimated, underlineWidthAnimated]);

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };

    // If this is the active tab and we haven't initialized the underline yet, set it immediately
    if (index === activeIndex && !isInitialized.current) {
      underlineAnimated.setValue(x);
      underlineWidthAnimated.setValue(width);
      isInitialized.current = true;
    }
  };

  const handleTabPress = (index: number) => {
    if (!locked) {
      onTabPress(index);
    }
  };

  return (
    <Box style={tw.style('relative overflow-hidden', style)} testID={testID}>
      {scrollEnabled ? (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw.style('flex-grow-0')}
          contentContainerStyle={tw.style('flex-row')}
          scrollsToTop={false}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="border-b border-border-muted bg-background-default relative"
          >
            {tabs.map((tab, index) => (
              <Box
                key={tab.key}
                onLayout={(event) => handleTabLayout(index, event)}
              >
                <Tab
                  label={tab.label}
                  isActive={index === activeIndex}
                  onPress={() => handleTabPress(index)}
                  style={tabStyle}
                  textStyle={textStyle}
                  testID={`${testID}-tab-${index}`}
                />
              </Box>
            ))}

            {/* Animated underline for scrollable tabs */}
            <Animated.View
              style={tw.style(
                'absolute bottom-0 h-0.5 bg-icon-default',
                {
                  width: underlineWidthAnimated,
                  transform: [{ translateX: underlineAnimated }],
                },
                underlineStyle,
              )}
            />
          </Box>
        </ScrollView>
      ) : (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="border-b border-border-muted bg-background-default relative"
        >
          {tabs.map((tab, index) => (
            <Box
              key={tab.key}
              onLayout={(event) => handleTabLayout(index, event)}
            >
              <Tab
                label={tab.label}
                isActive={index === activeIndex}
                onPress={() => handleTabPress(index)}
                style={tabStyle}
                textStyle={textStyle}
                testID={`${testID}-tab-${index}`}
              />
            </Box>
          ))}

          {/* Animated underline for non-scrollable tabs */}
          <Animated.View
            style={tw.style(
              'absolute bottom-0 h-0.5 bg-icon-default',
              {
                width: underlineWidthAnimated,
                transform: [{ translateX: underlineAnimated }],
              },
              underlineStyle,
            )}
          />
        </Box>
      )}
    </Box>
  );
};

export default TabsBar;
