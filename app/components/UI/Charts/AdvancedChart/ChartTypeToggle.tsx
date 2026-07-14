import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';

interface ChartTypeToggleProps {
  chartType?: ChartType;
  onChartTypeSelect?: (type: ChartType) => void;
  /** Outer container classes; defaults to time-range row spacing. */
  containerTwClassName?: string;
  /** Override icon color when ambient A/B is active. */
  selectedColor?: string;
}

const DEFAULT_CONTAINER_CLASS =
  'ml-2 rounded-lg border border-border-muted p-0.5';

const ChartTypeToggle: React.FC<ChartTypeToggleProps> = ({
  chartType,
  onChartTypeSelect,
  containerTwClassName = DEFAULT_CONTAINER_CLASS,
  selectedColor,
}) => {
  const tw = useTailwind();

  if (!onChartTypeSelect) return null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={containerTwClassName}
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
            selectedColor
              ? `text-[${selectedColor}]`
              : chartType === ChartType.Line
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
        accessibilityState={{ selected: chartType === ChartType.Candles }}
      >
        <Icon
          name={IconName.Candlestick}
          size={IconSize.Sm}
          twClassName={
            selectedColor
              ? `text-[${selectedColor}]`
              : chartType === ChartType.Candles
                ? 'text-icon-default'
                : 'text-icon-alternative'
          }
        />
      </Pressable>
    </Box>
  );
};

export default ChartTypeToggle;
