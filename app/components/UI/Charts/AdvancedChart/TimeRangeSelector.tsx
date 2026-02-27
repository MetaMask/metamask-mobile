import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';

export type TimeRange = '1H' | '1D' | '1W' | '1M' | 'YTD' | 'ALL';

/** Valid Hyperliquid candle interval values */
export type CandleInterval = '1m' | '15m' | '1h' | '4h' | '1d';

export interface TimeRangeConfig {
  /** Hyperliquid candle interval */
  hlInterval: CandleInterval;
  /** Number of candles to fetch */
  count: number;
}

const ytdDays = () => {
  const now = new Date();
  const startOfYear = Date.UTC(now.getFullYear(), 0, 1);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - startOfYear) / 86_400_000) + 1;
};

export const TIME_RANGE_CONFIGS: Record<TimeRange, TimeRangeConfig> = {
  '1H': { hlInterval: '1m', count: 60 },
  '1D': { hlInterval: '15m', count: 96 },
  '1W': { hlInterval: '1h', count: 168 },
  '1M': { hlInterval: '4h', count: 180 },
  get YTD() {
    return { hlInterval: '1d' as const, count: Math.min(ytdDays(), 500) };
  },
  ALL: { hlInterval: '1d', count: 500 },
};

const TIME_RANGES: TimeRange[] = ['1H', '1D', '1W', '1M', 'YTD', 'ALL'];

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  /** Optional subset of ranges to display. Defaults to all. */
  ranges?: TimeRange[];
}

const selectorStyleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    button: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonSelected: {
      backgroundColor: theme.colors.background.muted,
    },
    buttonPressed: {
      opacity: 0.7,
    },
  });
};

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selected,
  onSelect,
  ranges = TIME_RANGES,
}) => {
  const { styles } = useStyles(selectorStyleSheet, {});

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={1}
      twClassName="py-2 px-4"
    >
      {ranges.map((range) => {
        const isSelected = selected === range;
        return (
          <Pressable
            key={range}
            style={({ pressed }) => [
              styles.button,
              isSelected && styles.buttonSelected,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onSelect(range)}
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName={
                isSelected ? 'text-text-default' : 'text-text-alternative'
              }
            >
              {range}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
};

export default TimeRangeSelector;
