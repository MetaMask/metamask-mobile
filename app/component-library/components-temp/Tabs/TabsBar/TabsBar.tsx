// Third party dependencies.
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
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

  // Enhanced TabsBar with animated underline and smart layout detection

  const scrollViewRef = useRef<ScrollView>(null);

  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const underlineWidthAnimated = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const isInitialized = useRef(false);
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const rafId = useRef<number | null>(null);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const pendingActiveIndex = useRef<number | null>(null);
  const [hasValidDimensions, setHasValidDimensions] = useState(false);
  const [isInitializedState, setIsInitializedState] = useState(false);
  const [hasAllTabLayouts, setHasAllTabLayouts] = useState(false);

  // State for automatic overflow detection
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Reset layout data when tabs change structurally (not just re-renders)
  const tabKeys = useMemo(() => tabs.map((tab) => tab.key).join(','), [tabs]);

  useEffect(() => {
    // Check if reset is needed

    // Only reset if tabs length changed or if we don't have layouts yet
    const shouldReset =
      tabLayouts.current.length !== tabs.length ||
      tabLayouts.current.every((layout) => !layout);

    if (shouldReset) {
      // Reset all layout data and state
      tabLayouts.current = new Array(tabs.length);
      isInitialized.current = false;
      setIsInitializedState(false);
      setScrollEnabled(false);
      setIsLayoutReady(false);
      setHasValidDimensions(false);
      setHasAllTabLayouts(false);
      pendingActiveIndex.current = null;
      // Stop any ongoing animation when tabs change
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
    }
  }, [tabKeys, tabs.length]);

  // Improved animation function that handles race conditions
  const animateToTab = useCallback(
    (targetIndex: number) => {
      // Stop any ongoing animation
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      // Validate target index and layout data
      if (targetIndex < 0 || targetIndex >= tabLayouts.current.length) {
        return;
      }

      const activeTabLayout = tabLayouts.current[targetIndex];

      if (
        !activeTabLayout ||
        typeof activeTabLayout.x !== 'number' ||
        typeof activeTabLayout.width !== 'number'
      ) {
        // Store as pending for when layout measurement completes
        pendingActiveIndex.current = targetIndex;
        return;
      }

      // Clear any pending animation since we're about to animate
      pendingActiveIndex.current = null;

      // Check if this is the very first initialization (no previous position set)
      const isFirstInitialization = !isInitialized.current;

      if (isFirstInitialization) {
        // First initialization - setting initial position
        // Set initial position without animation on first render
        underlineAnimated.setValue(activeTabLayout.x);
        underlineWidthAnimated.setValue(activeTabLayout.width);
        isInitialized.current = true;

        // Use requestAnimationFrame to ensure state updates happen in the next frame
        // This ensures the component re-renders with the updated state
        // In tests, update synchronously to avoid act() warnings
        if (process.env.JEST_WORKER_ID) {
          setIsInitializedState(true);
          setHasValidDimensions(true);
          setIsLayoutReady(true);
        } else {
          rafId.current = requestAnimationFrame(() => {
            setIsInitializedState(true);
            setHasValidDimensions(true);
            setIsLayoutReady(true);
            // First initialization complete
            rafId.current = null;
          });
        }
      } else {
        // Subsequent animation - animating to new position

        // Cancel any existing animation immediately for rapid clicking
        if (currentAnimation.current) {
          (currentAnimation.current as Animated.CompositeAnimation).stop();
          currentAnimation.current = null;
        }

        // Ensure hasValidDimensions is true for subsequent animations
        setHasValidDimensions(true);

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

  // FIXED: Consolidated animation effect - prevents infinite loops by handling all animation triggers in one place
  useEffect(() => {
    // Don't animate if no active tab
    if (activeIndex < 0) {
      // Stop any ongoing animation when no tab is active
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
      return;
    }

    // Check if we have the necessary layout data for the active tab
    const activeTabLayout = tabLayouts.current[activeIndex];
    const hasActiveTabLayout = activeTabLayout && activeTabLayout.width > 0;

    // Only animate if we have valid layout data for the active tab
    // This prevents infinite loops by only triggering when we actually have the data needed
    if (hasActiveTabLayout) {
      animateToTab(activeIndex);
    }
    // If we don't have layout data, the animation will be triggered
    // when handleTabLayout receives the layout information
  }, [activeIndex, animateToTab]);

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
      // Handle tab layout measurement

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
      // Store layout data for this tab

      // Check if we now have all tab layouts
      const allLayoutsAvailable = tabLayouts.current.every(
        (layout, i) =>
          i >= tabs.length ||
          (layout && typeof layout.width === 'number' && layout.width > 0),
      );

      if (allLayoutsAvailable && !hasAllTabLayouts) {
        // All tab layouts are now available
        setHasAllTabLayouts(true);
      }

      // FIXED: Only trigger animation if this is the active tab AND we haven't initialized yet
      // This prevents redundant animation calls since the main useEffect will handle most cases
      if (index === activeIndex && activeIndex >= 0 && !isInitialized.current) {
        // This is the active tab and we haven't initialized yet, animate to it
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

        // Layout is ready when all tabs are measured - the main useEffect will handle animation
      }
    },
    [
      activeIndex,
      animateToTab,
      containerWidth,
      isLayoutReady,
      hasAllTabLayouts,
      tabs,
    ],
  );

  // Cleanup effect to cancel requestAnimationFrame on unmount
  useEffect(
    () => () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
    },
    [],
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

            {/* Animated underline for scrollable tabs - only show if there's an active tab and it's initialized */}
            {(() => {
              const shouldShow =
                activeIndex >= 0 && isInitializedState && hasValidDimensions;
              return (
                shouldShow && (
                  <Animated.View
                    style={tw.style('absolute bottom-0 h-0.5 bg-icon-default', {
                      width: underlineWidthAnimated,
                      transform: [{ translateX: underlineAnimated }],
                    })}
                  />
                )
              );
            })()}
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

          {/* Animated underline for non-scrollable tabs - only show if there's an active tab and it's initialized */}
          {(() => {
            const shouldShow =
              activeIndex >= 0 && isInitializedState && hasValidDimensions;
            return (
              shouldShow && (
                <Animated.View
                  style={tw.style('absolute bottom-0 h-0.5 bg-icon-default', {
                    width: underlineWidthAnimated,
                    transform: [{ translateX: underlineAnimated }],
                  })}
                />
              )
            );
          })()}
        </Box>
      )}
    </Box>
  );
};

export default TabsBar;
