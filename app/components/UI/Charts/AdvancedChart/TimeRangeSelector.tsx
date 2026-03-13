import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import { Theme } from '../../../../util/theme/models';
import { ChartType } from './AdvancedChart.types';

const CandlestickIcon = ({
  color,
  size = 16,
}: {
  color: string;
  size?: number;
}) => (
  <Svg width={size * 0.875} height={size} viewBox="0 0 14 16" fill="none">
    <Path d="M4 0H2V2H0V14H2V16H4V14H6V2H4V0ZM4 12H2V4H4V12Z" fill={color} />
    <Path
      d="M14 4H12V0H10V4H8V11H10V16H12V11H14V4ZM12 9H10V6H12V9Z"
      fill={color}
    />
  </Svg>
);

const LineChartIcon = ({
  color,
  size = 16,
}: {
  color: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 16.5L9 10L13 16L21 6.5"
      stroke={color}
      strokeWidth={2.04}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export type TimeRange = '1H' | '1D' | '1W' | '1M' | '1Y';

/** Valid OHLCV API time period values */
export type OHLCVTimePeriod = '1h' | '1d' | '1w' | '1m' | '1y';

export interface TimeRangeConfig {
  /** API timePeriod query parameter */
  timePeriod: OHLCVTimePeriod;
  /** Optional interval override. When undefined, API uses its default for the timePeriod. */
  interval?: string;
}

export const TIME_RANGE_CONFIGS: Record<TimeRange, TimeRangeConfig> = {
  '1H': { timePeriod: '1h' },
  '1D': { timePeriod: '1d' },
  '1W': { timePeriod: '1w' },
  '1M': { timePeriod: '1m' },
  '1Y': { timePeriod: '1y' },
};

const TIME_RANGES: TimeRange[] = ['1H', '1D', '1W', '1M', '1Y'];

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  /** Optional subset of ranges to display. Defaults to all. */
  ranges?: TimeRange[];
  /** Current chart type -- drives the toggle icon appearance. */
  chartType?: ChartType;
  /** Called when the user taps the chart type toggle icon. */
  onChartTypeToggle?: () => void;
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
  chartType,
  onChartTypeToggle,
}) => {
  const { styles } = useStyles(selectorStyleSheet, {});
  const { colors } = useTheme();

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
      {onChartTypeToggle && (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onChartTypeToggle}
          accessibilityRole="button"
          accessibilityLabel={
            chartType === ChartType.Candles
              ? 'Switch to line chart'
              : 'Switch to candlestick chart'
          }
        >
          {chartType === ChartType.Candles ? (
            <CandlestickIcon color={colors.text.alternative} size={16} />
          ) : (
            <LineChartIcon color={colors.text.alternative} size={16} />
          )}
        </Pressable>
      )}
    </Box>
  );
};

export default TimeRangeSelector;
