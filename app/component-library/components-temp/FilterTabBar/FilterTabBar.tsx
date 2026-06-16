import React from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  ButtonFilter,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { FilterTabBarProps } from './FilterTabBar.types';

/**
 * A horizontally scrollable row of filter pills built on the design-system
 * `ButtonFilter`. Renders a single active tab driven by `selectedKey` and
 * reports presses through `onSelect`.
 */
const FilterTabBar = ({
  tabs,
  selectedKey,
  onSelect,
  style,
  testID,
}: FilterTabBarProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="py-1" style={style} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('flex-grow-0')}
        contentContainerStyle={tw.style('flex-row items-center gap-2 px-4')}
      >
        {tabs.map((tab) => (
          <ButtonFilter
            key={tab.key}
            isActive={tab.key === selectedKey}
            size={ButtonSize.Sm}
            onPress={() => onSelect(tab.key)}
            testID={tab.testID}
          >
            {tab.label}
          </ButtonFilter>
        ))}
      </ScrollView>
    </Box>
  );
};

export default FilterTabBar;
