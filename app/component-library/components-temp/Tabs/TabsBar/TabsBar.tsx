// Third party dependencies.
import React, { useRef, useState, useCallback } from 'react';
import { ScrollView, LayoutChangeEvent } from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

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

  // TabsBar with automatic scroll detection

  const [scrollEnabled, setScrollEnabled] = useState(false);
  const containerWidthRef = useRef(0);

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
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        style={tw.style('flex-grow-0')}
        contentContainerStyle={tw.style('flex-row px-4 gap-6')}
        scrollsToTop={false}
        onContentSizeChange={handleContentSizeChange}
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
      </ScrollView>
    </Box>
  );
};

export default TabsBar;
