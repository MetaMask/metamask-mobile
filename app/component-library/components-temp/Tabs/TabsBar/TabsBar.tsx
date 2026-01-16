// Third party dependencies.
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Animated, LayoutChangeEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

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
  twClassName,
  ...boxProps
}) => {
  const tw = useTailwind();

  // TabsBar with animated underline and automatic scroll detection

  const scrollViewRef = useRef<ScrollView>(null);

  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const underlineWidthAnimated = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const rafCallbackId = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [layoutsReady, setLayoutsReady] = useState(false);
  const activeIndexRef = useRef(activeIndex);

  // State for automatic overflow detection
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Keep activeIndexRef in sync with activeIndex
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Reset layout data when tabs change structurally (count or content)
  const tabKeys = useMemo(() => tabs.map((tab) => tab.key).join(','), [tabs]);
  const prevTabKeys = useRef<string>('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip reset logic on initial mount to avoid interfering with initialization
    if (isInitialMount.current) {
      prevTabKeys.current = tabKeys;
      isInitialMount.current = false;
      return;
    }

    // Reset when tabs change (either count or content/keys)
    const shouldReset =
      tabLayouts.current.length !== tabs.length ||
      prevTabKeys.current !== tabKeys;

    if (shouldReset) {
      // Store current tab keys for next comparison
      prevTabKeys.current = tabKeys;
      // Reset all layout state
      tabLayouts.current = new Array(tabs.length);
      setIsInitialized(false);
      setLayoutsReady(false);
      setScrollEnabled(false);

      // Stop any ongoing animation
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      // Force re-measurement by resetting container width temporarily
      // This ensures fresh layout measurements for the new tab structure
      setContainerWidth(0);
    }
  }, [tabKeys, tabs.length]);

  // Animation function for smooth underline transitions
  const animateToTab = useCallback(
    (targetIndex: number) => {
      // Stop any ongoing animation
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      // Validate target index
      if (targetIndex < 0 || targetIndex >= tabs.length) {
        return;
      }

      const activeTabLayout = tabLayouts.current[targetIndex];

      // If layout isn't ready yet, we'll animate when it becomes available
      if (!activeTabLayout || activeTabLayout.width <= 0) {
        return;
      }

      const isFirstTime = !isInitialized;

      if (isFirstTime) {
        // First time - set position immediately
        underlineAnimated.setValue(activeTabLayout.x);
        underlineWidthAnimated.setValue(activeTabLayout.width);
        setIsInitialized(true);
      } else {
        // Animate to new position
        const animation = Animated.parallel([
          Animated.timing(underlineAnimated, {
            toValue: activeTabLayout.x,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(underlineWidthAnimated, {
            toValue: activeTabLayout.width,
            duration: 200,
            useNativeDriver: false,
          }),
        ]);

        currentAnimation.current = animation;
        animation.start((finished) => {
          if (finished && currentAnimation.current === animation) {
            currentAnimation.current = null;
          }
        });
      }

      // Handle scrolling
      if (scrollEnabled && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, activeTabLayout.x - 50),
          animated: !isFirstTime,
        });
      }
    },
    [
      scrollEnabled,
      underlineAnimated,
      underlineWidthAnimated,
      tabs.length,
      isInitialized,
    ],
  );

  // Animate when activeIndex changes and layouts are ready
  useEffect(() => {
    if (activeIndex >= 0 && layoutsReady) {
      animateToTab(activeIndex);
    }
  }, [activeIndex, layoutsReady, animateToTab]);

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
        const gapsWidth = (tabs.length - 1) * 24; // Account for gaps between tabs
        const calculatedContentWidth = totalTabsWidth + gapsWidth;

        // Account for container's px-4 padding (16px * 2 = 32px)
        const shouldScroll = calculatedContentWidth > containerWidth - 32;
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

      // Validate input
      if (index < 0 || index >= tabs.length || width <= 0) {
        return;
      }

      // Check if this is a significant change (more than 1px difference)
      const previousLayout = tabLayouts.current[index];
      const hasSignificantChange =
        !previousLayout ||
        Math.abs(previousLayout.width - width) > 1 ||
        Math.abs(previousLayout.x - x) > 1;

      // Store layout data
      tabLayouts.current[index] = { x, width };

      // Check if all layouts are now available
      const allLayoutsReady = tabLayouts.current.every(
        (layout, i) => i >= tabs.length || (layout && layout.width > 0),
      );

      if (allLayoutsReady) {
        // Recalculate scroll detection on initial load OR when any layout changes significantly
        if (!layoutsReady || hasSignificantChange) {
          if (!layoutsReady) {
            setLayoutsReady(true);
          }

          // If layouts were already ready and any tab changed, re-animate the active tab
          // This ensures re-animation triggers regardless of which tab's callback fires last
          if (layoutsReady && hasSignificantChange) {
            // Cancel any pending RAF to avoid multiple callbacks
            if (rafCallbackId.current !== null) {
              cancelAnimationFrame(rafCallbackId.current);
            }
            rafCallbackId.current = requestAnimationFrame(() => {
              rafCallbackId.current = null;
              animateToTab(activeIndexRef.current);
            });
          }

          // Update scroll detection
          if (containerWidth > 0) {
            const totalWidth = tabLayouts.current.reduce(
              (sum, layout) => sum + (layout?.width || 0),
              0,
            );
            const gapsWidth = (tabs.length - 1) * 24;
            // Account for container's px-4 padding (16px * 2 = 32px)
            const shouldScroll = totalWidth + gapsWidth > containerWidth - 32;
            setScrollEnabled(shouldScroll);
          }
        }
      }
    },
    [tabs.length, layoutsReady, containerWidth, animateToTab],
  );

  // Cleanup effect
  useEffect(
    () => () => {
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
      if (rafCallbackId.current !== null) {
        cancelAnimationFrame(rafCallbackId.current);
        rafCallbackId.current = null;
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
      twClassName={`relative overflow-hidden px-4 ${twClassName || ''}`}
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

            {/* Animated underline for scrollable tabs */}
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

          {/* Animated underline for non-scrollable tabs */}
          {activeIndex >= 0 && isInitialized && (
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
