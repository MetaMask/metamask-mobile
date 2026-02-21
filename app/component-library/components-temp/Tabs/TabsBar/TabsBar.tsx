// Third party dependencies.
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ScrollView, LayoutChangeEvent } from 'react-native';

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
  const scrollViewRef = useRef<ScrollView>(null);

  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (containerWidth > 0 && contentWidth > 0) {
      // Account for container's px-4 padding (16px * 2 = 32px)
      const shouldScroll = contentWidth > containerWidth - 32;
      setScrollEnabled(shouldScroll);
    }
  }, [containerWidth, contentWidth]);

  const handleContainerLayout = useCallback(
    (layoutEvent: LayoutChangeEvent) => {
      const { width } = layoutEvent.nativeEvent.layout;
      setContainerWidth(width);
    },
    [],
  );

  const handleContentLayout = useCallback((layoutEvent: LayoutChangeEvent) => {
    const { width } = layoutEvent.nativeEvent.layout;
    setContentWidth(width);
  }, []);

  const handleTabPress = (index: number) => {
    const tab = tabs[index];
    if (!tab?.isDisabled) {
      onTabPress(index);
    }
  };

  const renderTabs = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-6"
      onLayout={handleContentLayout as (layoutEvent: unknown) => void}
    >
      {tabs.map((tab, index) => (
        <Tab
          key={tab.key}
          label={tab.label}
          isActive={index === activeIndex}
          isDisabled={tab.isDisabled}
          onPress={() => handleTabPress(index)}
          testID={`${testID}-tab-${index}`}
        />
      ))}
    </Box>
  );

  return (
    <Box
      twClassName={`overflow-hidden px-4 ${twClassName || ''}`}
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
          {renderTabs()}
        </ScrollView>
      ) : (
        renderTabs()
      )}
    </Box>
  );
};

export default TabsBar;
