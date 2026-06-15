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
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';

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

      {onChartTypeSelect ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="shrink-0 rounded-lg border border-border-muted p-0.5"
        >
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'items-center justify-center rounded-md px-2 py-1',
                chartType === ChartType.Line && 'bg-background-hover',
                pressed && 'opacity-70',
              )
            }
            onPress={() => onChartTypeSelect(ChartType.Line)}
            accessibilityRole="button"
            accessibilityLabel="Line chart"
            accessibilityState={{ selected: chartType === ChartType.Line }}
          >
            <Icon
              name={IconName.Diagram}
              size={IconSize.Sm}
              twClassName={
                chartType === ChartType.Line
                  ? 'text-icon-default'
                  : 'text-icon-alternative'
              }
            />
          </Pressable>
          <Pressable
            style={({ pressed }) =>
              tw.style(
                'items-center justify-center rounded-md px-2 py-1',
                chartType === ChartType.Candles && 'bg-background-hover',
                pressed && 'opacity-70',
              )
            }
            onPress={() => onChartTypeSelect(ChartType.Candles)}
            accessibilityRole="button"
            accessibilityLabel="Candlestick chart"
            accessibilityState={{
              selected: chartType === ChartType.Candles,
            }}
          >
            <Icon
              name={IconName.Candlestick}
              size={IconSize.Sm}
              twClassName={
                chartType === ChartType.Candles
                  ? 'text-icon-default'
                  : 'text-icon-alternative'
              }
            />
          </Pressable>
        </Box>
      ) : null}
    </Box>
  );
};

export default IntervalBar;
