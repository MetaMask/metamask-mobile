// Third party dependencies.
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { TabsBarProps } from './TabsBar.types';

const TabsBar: React.FC<TabsBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  testID,
  ...boxProps
}) => {
  const tw = useTailwind();

  // TabsBar optimized

  const scrollViewRef = useRef<ScrollView>(null);

  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const underlineWidthAnimated = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const isInitialized = useRef(false);
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const pendingActiveIndex = useRef<number | null>(null);

  // State for automatic overflow detection
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Reset layout data when tabs change
  useEffect(() => {
    tabLayouts.current = new Array(tabs.length);
    isInitialized.current = false;
    setScrollEnabled(false);
    setIsLayoutReady(false);
    pendingActiveIndex.current = null;
    // Stop any ongoing animation when tabs change
    if (currentAnimation.current) {
      currentAnimation.current.stop();
      currentAnimation.current = null;
    }
  }, [tabs.length]);

  // Improved animation function that handles race conditions
  const animateToTab = useCallback(
    (targetIndex: number) => {
      // Animation optimized

      // Stop any ongoing animation
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      // Validate target index and layout data
      if (targetIndex < 0 || targetIndex >= tabLayouts.current.length) {
        // Early return: invalid targetIndex or tabLayouts length
        return;
      }

      const activeTabLayout = tabLayouts.current[targetIndex];
      // Check activeTabLayout for targetIndex

      if (
        !activeTabLayout ||
        typeof activeTabLayout.x !== 'number' ||
        typeof activeTabLayout.width !== 'number'
      ) {
        // If layout data isn't available yet, store this as a pending animation
        pendingActiveIndex.current = targetIndex;
        return;
      }

      // Clear any pending animation since we're about to animate
      pendingActiveIndex.current = null;

      // Check if this is the very first initialization (no previous position set)
      const isFirstInitialization = !isInitialized.current;

      if (isFirstInitialization) {
        // Set initial position without animation on first render
        underlineAnimated.setValue(activeTabLayout.x);
        underlineWidthAnimated.setValue(activeTabLayout.width);
        isInitialized.current = true;
      } else {
        // Cancel any existing animation immediately for rapid clicking
        if (currentAnimation.current) {
          (currentAnimation.current as Animated.CompositeAnimation).stop();
          currentAnimation.current = null;
        }

        // Always animate for subsequent tab changes, even if we're switching
        // to a tab that just got its layout measured
        const animation = Animated.parallel([
          Animated.timing(underlineAnimated, {
            toValue: activeTabLayout.x,
            duration: 200, // Fast and snappy
            useNativeDriver: false,
          }),
          Animated.timing(underlineWidthAnimated, {
            toValue: activeTabLayout.width,
            duration: 200, // Fast and snappy
            useNativeDriver: false,
          }),
        ]);

        currentAnimation.current = animation;
        animation.start((finished) => {
          // Clear the animation reference only if this animation completed
          if (finished && currentAnimation.current === animation) {
            currentAnimation.current = null;
          }
        });
      }

      // Scroll to active tab if needed
      if (scrollEnabled && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, activeTabLayout.x - 50),
          animated: true,
        });
      }
    },
    [scrollEnabled, underlineAnimated, underlineWidthAnimated],
  );

  // Force layout measurement after a short delay
  useEffect(() => {
    if (tabLayouts.current.length === tabs.length) {
      const hasAllLayouts = tabLayouts.current.every(
        (layout) => layout && layout.width > 0,
      );
      if (!hasAllLayouts) {
        // Missing layouts, trying to trigger animation anyway
        // Try to animate even without complete layout data
        animateToTab(activeIndex);
      }
    }
  }, [tabs.length, activeIndex, animateToTab]);

  // Animate underline when active tab changes
  useEffect(() => {
    // If activeIndex is -1, no tab is active, so don't animate underline
    if (activeIndex < 0) {
      // Stop any ongoing animation when no tab is active
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
      return;
    }

    animateToTab(activeIndex);
  }, [activeIndex, animateToTab]);

  // Ensure underline is initialized when layout becomes ready
  useEffect(() => {
    if (isLayoutReady && !isInitialized.current && activeIndex >= 0) {
      // Force initialization when layout is ready but underline hasn't been initialized yet
      animateToTab(activeIndex);
    }
  }, [isLayoutReady, activeIndex, animateToTab]);

  // Check if content overflows and update scroll state
  useEffect(() => {
    if (containerWidth > 0 && tabLayouts.current.length === tabs.length) {
      // Validate that all tab layouts are defined (prevent sparse array issues)
      const allLayoutsDefined = tabLayouts.current.every(
        (layout) => layout && typeof layout.width === 'number',
      );

      if (allLayoutsDefined) {
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
    }
  }, [containerWidth, tabs.length]);

  // Handle container layout to measure available width
  const handleContainerLayout = (layoutEvent: LayoutChangeEvent) => {
    const { width } = layoutEvent.nativeEvent.layout;
    setContainerWidth(width);
  };

  const handleTabLayout = useCallback(
    (index: number, layoutEvent: LayoutChangeEvent) => {
      const { x, width } = layoutEvent.nativeEvent.layout;

      // Validate input parameters
      if (typeof index !== 'number' || index < 0 || index >= tabs.length) {
        // Invalid index parameters
        return;
      }

      if (typeof x !== 'number' || typeof width !== 'number' || width <= 0) {
        // Invalid layout data
        return;
      }

      // Initialize array to proper length if needed to prevent sparse arrays
      if (tabLayouts.current.length < tabs.length) {
        tabLayouts.current = new Array(tabs.length);
      }

      // Store the wrapper dimensions directly
      tabLayouts.current[index] = { x, width };
      // Stored layout for index

      // If this is the active tab, try to animate to it (handles both initialization and updates)
      if (index === activeIndex && activeIndex >= 0) {
        // Use the improved animation function to handle initialization properly
        animateToTab(activeIndex);
      }

      // Check if there's a pending animation for this tab that just got its layout
      if (pendingActiveIndex.current === index && index >= 0) {
        // Execute the pending animation now that layout data is available
        animateToTab(index);
      }

      // Trigger scroll detection recalculation when all tabs are measured
      const allLayoutsDefined = tabLayouts.current.every(
        (layout) => layout && typeof layout.width === 'number',
      );

      if (allLayoutsDefined && containerWidth > 0) {
        const totalTabsWidth = tabLayouts.current.reduce(
          (sum, layout) => sum + layout.width,
          0,
        );
        const gapsWidth = (tabs.length - 1) * 24; // 24px = gap-6 in Tailwind
        const calculatedContentWidth = totalTabsWidth + gapsWidth;

        const shouldScroll = calculatedContentWidth > containerWidth;
        setScrollEnabled(shouldScroll);

        // Mark layout as ready when all tabs are measured
        if (!isLayoutReady) {
          setIsLayoutReady(true);
        }

        // CRITICAL FIX: If we haven't initialized the underline yet and we now have all layouts,
        // try to initialize it for the active tab
        if (
          !isInitialized.current &&
          activeIndex >= 0 &&
          activeIndex < tabLayouts.current.length
        ) {
          const activeTabLayout = tabLayouts.current[activeIndex];
          if (
            activeTabLayout &&
            typeof activeTabLayout.x === 'number' &&
            typeof activeTabLayout.width === 'number'
          ) {
            animateToTab(activeIndex);
          }
        }
      }
    },
    [tabs.length, activeIndex, animateToTab, containerWidth, isLayoutReady],
  );

  const handleTabPress = (index: number) => {
    const tab = tabs[index];
    if (!tab?.isDisabled) {
      onTabPress(index);
    }
  };

  return (
    <Box
      twClassName="relative overflow-hidden"
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
          contentContainerStyle={tw.style('flex-row')}
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
                testID={`${testID}-tab-${index}`}
              />
            ))}

            {/* Animated underline for scrollable tabs - only show if there's an active tab */}
            {activeIndex >= 0 && (
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
              testID={`${testID}-tab-${index}`}
            />
          ))}

          {/* Animated underline for non-scrollable tabs - only show if there's an active tab */}
          {activeIndex >= 0 && (
            <Animated.View
              style={tw.style('absolute bottom-0 h-0.5 bg-icon-default', {
                width: underlineWidthAnimated,
                transform: [{ translateX: underlineAnimated }],
              })}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default TabsBar;
