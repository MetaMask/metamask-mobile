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
  twClassName,
  style,
  ...props
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
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const containerWidthRef = useRef(0);

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

      // Stop any ongoing animation
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
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

      // Handle scrolling - scroll to keep active tab visible
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

  // Combined handler: measure container width and check if scrolling is needed
  const handleContainerLayout = useCallback(
    (layoutEvent: LayoutChangeEvent) => {
      const { width } = layoutEvent.nativeEvent.layout;
      containerWidthRef.current = width;
    },
    [],
  );

  // Handle content size change to enable/disable scrolling
  const handleContentSizeChange = useCallback((contentWidth: number) => {
    // Enable scrolling if content is wider than container
    if (containerWidthRef.current > 0) {
      setScrollEnabled(contentWidth > containerWidthRef.current);
    }
  }, []);

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
        }
      }
    },
    [tabs.length, layoutsReady, animateToTab],
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
      twClassName={`relative overflow-hidden ${twClassName || ''}`}
      style={style}
      testID={testID}
      onLayout={handleContainerLayout as (layoutEvent: unknown) => void}
      {...props}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        style={tw.style('flex-grow-0')}
        contentContainerStyle={tw.style('flex-row px-4')}
        scrollsToTop={false}
        onContentSizeChange={handleContentSizeChange}
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
    </Box>
  );
};

export default TabsBar;
