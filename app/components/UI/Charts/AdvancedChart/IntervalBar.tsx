import React from 'react';
import { Pressable, ScrollView } from 'react-native';
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
import { TOKEN_OVERVIEW_CHART_INTERVALS } from '../../AssetOverview/Price/tokenOverviewChart.constants';

const PILL_BASE = 'flex-row items-center justify-center rounded-full px-2 py-1';

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('grow flex-row items-center gap-1')}
      >
        {TOKEN_OVERVIEW_CHART_INTERVALS.map((interval) => {
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
      </ScrollView>

      <ChartTypeToggle
        chartType={chartType}
        onChartTypeSelect={onChartTypeSelect}
        containerTwClassName="shrink-0 rounded-full border border-border-muted p-0.5"
      />
    </Box>
  );
};

export default IntervalBar;
