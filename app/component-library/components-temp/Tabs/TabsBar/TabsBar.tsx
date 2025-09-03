// Third party dependencies.
import React, { useEffect, useRef, useState } from 'react';
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
  locked = false,
  testID,
}) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<ScrollView>(null);

  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const underlineWidthAnimated = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const isInitialized = useRef(false);

  // State for automatic overflow detection
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

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

  // Check if content overflows and update scroll state
  useEffect(() => {
    if (containerWidth > 0 && tabLayouts.current.length === tabs.length) {
      // Calculate total content width by summing tab widths + gaps
      const totalTabsWidth = tabLayouts.current.reduce(
        (sum, layout) => sum + layout.width,
        0,
      );
      const gapsWidth = (tabs.length - 1) * 24; // 24px = gap-6 in Tailwind
      const calculatedContentWidth = totalTabsWidth + gapsWidth;

      const shouldScroll = calculatedContentWidth > containerWidth;
      setScrollEnabled(shouldScroll);
    }
  }, [containerWidth, contentWidth, tabs.length]);

  // Handle container layout to measure available width
  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  // Handle content layout to measure total tabs width
  const handleContentLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContentWidth(width);
  };

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;

    // Store the wrapper dimensions directly
    tabLayouts.current[index] = { x, width };

    // If this is the active tab and we haven't initialized the underline yet, set it immediately
    if (index === activeIndex && !isInitialized.current) {
      underlineAnimated.setValue(x);
      underlineWidthAnimated.setValue(width);
      isInitialized.current = true;
    }

    // Trigger scroll detection recalculation when all tabs are measured
    if (tabLayouts.current.length === tabs.length && containerWidth > 0) {
      const totalTabsWidth = tabLayouts.current.reduce(
        (sum, layout) => sum + layout.width,
        0,
      );
      const gapsWidth = (tabs.length - 1) * 24; // 24px = gap-6 in Tailwind
      const calculatedContentWidth = totalTabsWidth + gapsWidth;

      const shouldScroll = calculatedContentWidth > containerWidth;
      setScrollEnabled(shouldScroll);
    }
  };

  const handleTabPress = (index: number) => {
    if (!locked) {
      onTabPress(index);
    }
  };

  return (
    <Box
      twClassName="relative overflow-hidden"
      testID={testID}
      onLayout={handleContainerLayout}
    >
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
            twClassName="relative gap-6"
            onLayout={handleContentLayout}
          >
            {tabs.map((tab, index) => (
              <Box
                key={tab.key}
                onLayout={(event) => handleTabLayout(index, event)}
              >
                <Tab
                  label={tab.label}
                  isActive={index === activeIndex}
                  disabled={locked}
                  onPress={() => handleTabPress(index)}
                  testID={`${testID}-tab-${index}`}
                />
              </Box>
            ))}

            {/* Animated underline for scrollable tabs */}
            <Animated.View
              style={tw.style('absolute bottom-0 h-0.5 bg-icon-default', {
                width: underlineWidthAnimated,
                transform: [{ translateX: underlineAnimated }],
              })}
            />
          </Box>
        </ScrollView>
      ) : (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="relative gap-6"
          onLayout={handleContentLayout}
        >
          {tabs.map((tab, index) => (
            <Box
              key={tab.key}
              onLayout={(event) => handleTabLayout(index, event)}
            >
              <Tab
                label={tab.label}
                isActive={index === activeIndex}
                disabled={locked}
                onPress={() => handleTabPress(index)}
                testID={`${testID}-tab-${index}`}
              />
            </Box>
          ))}

          {/* Animated underline for non-scrollable tabs */}
          <Animated.View
            style={tw.style('absolute bottom-0 h-0.5 bg-icon-default', {
              width: underlineWidthAnimated,
              transform: [{ translateX: underlineAnimated }],
            })}
          />
        </Box>
      )}
    </Box>
  );
};

export default TabsBar;
