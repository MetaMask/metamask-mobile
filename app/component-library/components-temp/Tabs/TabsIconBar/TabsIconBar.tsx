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
import TabsIconTab from '../TabsIconTab/TabsIconTab';
import { TabsIconBarProps } from './TabsIconBar.types';

const TabsIconBar: React.FC<TabsIconBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
  testID,
  twClassName,
  fillWidth = false,
  collapseAnim,
  ...boxProps
}) => {
  const tw = useTailwind();

  const scrollViewRef = useRef<ScrollView>(null);

  const underlineAnimated = useRef(new Animated.Value(0)).current;
  const [underlineWidth, setUnderlineWidth] = useState(0);
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const rafCallbackId = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [layoutsReady, setLayoutsReady] = useState(false);
  const activeIndexRef = useRef(activeIndex);

  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Height collapse animation — icon tabs always have a border-b row
  const [tabRowHeight, setTabRowHeight] = useState(0);
  const animatedHeight =
    collapseAnim && tabRowHeight > 0
      ? collapseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [tabRowHeight, 0],
        })
      : undefined;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const tabKeys = useMemo(() => tabs.map((tab) => tab.key).join(','), [tabs]);
  const prevTabKeys = useRef<string>('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      prevTabKeys.current = tabKeys;
      isInitialMount.current = false;
      return;
    }

    const shouldReset =
      tabLayouts.current.length !== tabs.length ||
      prevTabKeys.current !== tabKeys;

    if (shouldReset) {
      prevTabKeys.current = tabKeys;
      tabLayouts.current = Array.from({ length: tabs.length });
      setIsInitialized(false);
      setLayoutsReady(false);
      setScrollEnabled(false);

      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      setContainerWidth(0);
    }
  }, [tabKeys, tabs.length]);

  // When the rendering mode switches (non-scroll ↔ scroll), invalidate stored
  // layouts so stale x-offsets don't drive the underline before fresh measurements arrive.
  const prevScrollEnabled = useRef(scrollEnabled);
  useEffect(() => {
    if (prevScrollEnabled.current !== scrollEnabled) {
      prevScrollEnabled.current = scrollEnabled;
      tabLayouts.current = Array.from({ length: tabs.length });
      setIsInitialized(false);
      setLayoutsReady(false);
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
    }
  }, [scrollEnabled, tabs.length]);

  const animateToTab = useCallback(
    (targetIndex: number) => {
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }

      if (targetIndex < 0 || targetIndex >= tabs.length) {
        return;
      }

      const activeTabLayout = tabLayouts.current[targetIndex];

      if (!activeTabLayout || activeTabLayout.width <= 0) {
        return;
      }

      const isFirstTime = !isInitialized;

      // Icon tabs: underline is 75% of the tab width, centered
      const targetWidth = activeTabLayout.width * 0.75;
      const targetX = activeTabLayout.x + activeTabLayout.width * 0.125;

      if (isFirstTime) {
        underlineAnimated.setValue(targetX);
        setUnderlineWidth(targetWidth);
        setIsInitialized(true);
      } else {
        setUnderlineWidth(targetWidth);

        const animation = Animated.timing(underlineAnimated, {
          toValue: targetX,
          duration: 200,
          useNativeDriver: true,
        });

        currentAnimation.current = animation;
        animation.start((finished) => {
          if (finished && currentAnimation.current === animation) {
            currentAnimation.current = null;
          }
        });
      }

      // Snap scroll instantly so viewport settles before the underline animation begins.
      if (scrollEnabled && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: Math.max(0, activeTabLayout.x - 50),
          animated: false,
        });
      }
    },
    [scrollEnabled, underlineAnimated, tabs.length, isInitialized],
  );

  useEffect(() => {
    if (activeIndex >= 0 && layoutsReady) {
      animateToTab(activeIndex);
    }
  }, [activeIndex, layoutsReady, animateToTab]);

  useEffect(() => {
    if (fillWidth) return;
    if (containerWidth > 0 && tabLayouts.current.length === tabs.length) {
      const allLayoutsDefined = tabLayouts.current.every(
        (layout) => layout && typeof layout.width === 'number',
      );

      if (allLayoutsDefined) {
        const totalTabsWidth = tabLayouts.current.reduce(
          (sum, layout) => sum + layout.width,
          0,
        );
        const gapsWidth = (tabs.length - 1) * 24;
        const calculatedContentWidth = totalTabsWidth + gapsWidth;
        const shouldScroll = calculatedContentWidth > containerWidth - 32;
        setScrollEnabled(shouldScroll);
      }
    }
  }, [fillWidth, containerWidth, tabs.length]);

  const handleContainerLayout = (layoutEvent: LayoutChangeEvent) => {
    const { width } = layoutEvent.nativeEvent.layout;
    setContainerWidth(width);
  };

  const handleTabLayout = useCallback(
    (index: number, layoutEvent: LayoutChangeEvent) => {
      const { x, width } = layoutEvent.nativeEvent.layout;

      if (index < 0 || index >= tabs.length || width <= 0) {
        return;
      }

      const previousLayout = tabLayouts.current[index];
      const hasSignificantChange =
        !previousLayout ||
        Math.abs(previousLayout.width - width) > 1 ||
        Math.abs(previousLayout.x - x) > 1;

      tabLayouts.current[index] = { x, width };

      const allLayoutsReady = tabLayouts.current.every(
        (layout, i) => i >= tabs.length || (layout && layout.width > 0),
      );

      if (allLayoutsReady) {
        if (!layoutsReady || hasSignificantChange) {
          if (!layoutsReady) {
            setLayoutsReady(true);
          }

          if (layoutsReady && hasSignificantChange) {
            if (rafCallbackId.current !== null) {
              cancelAnimationFrame(rafCallbackId.current);
            }
            rafCallbackId.current = requestAnimationFrame(() => {
              rafCallbackId.current = null;
              animateToTab(activeIndexRef.current);
            });
          }

          if (containerWidth > 0) {
            const totalWidth = tabLayouts.current.reduce(
              (sum, layout) => sum + (layout?.width || 0),
              0,
            );
            const gapsWidth = (tabs.length - 1) * 24;
            const shouldScroll = totalWidth + gapsWidth > containerWidth - 32;
            setScrollEnabled(shouldScroll);
          }
        }
      }
    },
    [tabs.length, layoutsReady, containerWidth, animateToTab],
  );

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
          onLayout={({ nativeEvent }) => {
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
