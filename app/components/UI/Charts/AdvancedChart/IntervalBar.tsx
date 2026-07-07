import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';
import ChartTypeToggle from './ChartTypeToggle';

const QUICK_INTERVALS = ['1m', '5m', '15m', '1h', '1d'] as const;

const PILL_BASE = 'flex-row items-center justify-center rounded-xl px-2 py-1';

interface IntervalBarProps {
  selectedInterval: string;
  onIntervalSelect?: (interval: string) => void;
  chartType?: ChartType;
  onChartTypeSelect?: (type: ChartType) => void;
}

const IntervalBar: React.FC<IntervalBarProps> = ({
  selectedInterval,
  onIntervalSelect,
  chartType,
  onChartTypeSelect,
}) => {
  const tw = useTailwind();

  const normalised = selectedInterval.toLowerCase();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full px-4"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 gap-1"
      >
        {QUICK_INTERVALS.map((interval) => {
          const isSelected = normalised === interval;
          return (
            <Pressable
              key={interval}
              style={({ pressed }) =>
                tw.style(
                  PILL_BASE,
                  isSelected && 'bg-muted',
                  pressed && 'opacity-70',
                )
              }
              onPress={() => onIntervalSelect?.(interval.toUpperCase())}
              accessibilityRole="button"
              accessibilityLabel={interval}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={isSelected ? FontWeight.Bold : FontWeight.Medium}
                twClassName={
                  isSelected ? 'text-text-default' : 'text-text-alternative'
                }
              >
                {interval}
              </Text>
            </Pressable>
          );
        })}
      </Box>

      <ChartTypeToggle
        chartType={chartType}
        onChartTypeSelect={onChartTypeSelect}
        containerTwClassName="shrink-0 rounded-lg border border-border-muted p-0.5"
      />
    </Box>
  );
};

export default IntervalBar;
