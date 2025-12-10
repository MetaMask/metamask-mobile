// Third party dependencies.
import React, {
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  ScrollView,
  LayoutChangeEvent,
  View,
  findNodeHandle,
  UIManager,
} from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

// Internal dependencies.
import Tab from '../Tab';
import { TabsBarProps, TabsBarRef } from './TabsBar.types';

const TabsBar = forwardRef<TabsBarRef, TabsBarProps>(
  (
    { tabs, activeIndex, onTabPress, testID, twClassName, style, ...props },
    ref,
  ) => {
    const tw = useTailwind();

    // Refs for scrolling to active tab
    const scrollRef = useRef<ScrollView>(null);
    const tabRefs = useRef<(View | null)[]>([]);

    // TabsBar with automatic scroll detection
    const [scrollEnabled, setScrollEnabled] = useState(false);
    const containerWidthRef = useRef(0);

    useImperativeHandle(ref, () => ({
      scrollToTab: (index: number) => {
        const tabRef = tabRefs.current[index];
        const scrollView = scrollRef.current;
        if (!tabRef || !scrollView) return;

        const tabNode = findNodeHandle(tabRef);
        const scrollNode = findNodeHandle(scrollView);
        if (!tabNode || !scrollNode) return;

        UIManager.measureLayout(
          tabNode,
          scrollNode,
          () => undefined,
          (x) => {
            scrollView.scrollTo({ x: Math.max(0, x - 16), animated: true });
          },
        );
      },
    }));

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
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
          style={tw.style('flex-grow-0')}
          contentContainerStyle={tw.style('flex-row px-4 gap-6')}
          scrollsToTop={false}
          onContentSizeChange={handleContentSizeChange}
        >
          {tabs.map((tab, index) => (
            <View
              key={tab.key}
              collapsable={false}
              ref={(r) => {
                tabRefs.current[index] = r;
              }}
            >
              <Tab
                label={tab.label}
                isActive={index === activeIndex}
                isDisabled={tab.isDisabled}
                onPress={() => handleTabPress(index)}
                testID={`${testID}-tab-${index}`}
              />
            </View>
          ))}
        </ScrollView>
      </Box>
    );
  },
);

TabsBar.displayName = 'TabsBar';

export default TabsBar;
