import React, { useCallback, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import { EventMarketPeriodChipsTestIds } from './EventMarketPeriodChips.testIds';

export interface EventMarketPeriod {
  key: string;
  label: string;
}

export interface EventMarketPeriodChipsProps {
  items: readonly EventMarketPeriod[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

// Sub-pixel scroll offsets shouldn't keep a fade on at either end.
const SCROLL_EDGE_TOLERANCE = 1;

/** `#rrggbb` → `#rrggbb00`, so the fade blends into the background colour. */
const transparent = (hexColor: string) =>
  /^#[0-9a-f]{6}$/i.test(hexColor) ? `${hexColor}00` : 'transparent';

/**
 * Single-select chips for an Event market section's periods (Full game, 1st
 * half, …). Scrolls horizontally when the chips overflow, with a fade over
 * each edge while chips are hidden past it.
 */
export const EventMarketPeriodChips = ({
  items,
  selectedKey,
  onSelect,
}: EventMarketPeriodChipsProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);
  const handleContentSizeChange = useCallback((width: number) => {
    setContentWidth(width);
  }, []);
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollX(event.nativeEvent.contentOffset.x);
    },
    [],
  );

  const hasChipsBefore = scrollX > SCROLL_EDGE_TOLERANCE;
  const hasChipsAfter =
    containerWidth > 0 &&
    contentWidth - containerWidth - scrollX > SCROLL_EDGE_TOLERANCE;
  const background = colors.background.default;

  return (
    <Box>
      <FilterButtonGroup
        value={selectedKey}
        onChange={onSelect}
        variant={FilterButtonVariant.Secondary}
        twClassName="gap-2"
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        testID={EventMarketPeriodChipsTestIds.LIST}
      >
        {items.map(({ key, label }) => (
          <FilterButton
            key={key}
            value={key}
            size={FilterButtonSize.Md}
            accessibilityRole="tab"
            accessibilityState={{ selected: key === selectedKey }}
            testID={EventMarketPeriodChipsTestIds.CHIP(key)}
          >
            {label}
          </FilterButton>
        ))}
      </FilterButtonGroup>
      {hasChipsBefore ? (
        <LinearGradient
          pointerEvents="none"
          colors={[background, transparent(background)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw.style('absolute left-0 top-0 bottom-0 w-14')}
          testID={EventMarketPeriodChipsTestIds.FADE('start')}
        />
      ) : null}
      {hasChipsAfter ? (
        <LinearGradient
          pointerEvents="none"
          colors={[transparent(background), background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw.style('absolute right-0 top-0 bottom-0 w-14')}
          testID={EventMarketPeriodChipsTestIds.FADE('end')}
        />
      ) : null}
    </Box>
  );
};
