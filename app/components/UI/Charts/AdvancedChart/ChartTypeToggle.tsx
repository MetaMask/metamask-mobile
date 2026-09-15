import React from 'react';
import {
  Icon,
  IconName,
  IconSize,
  FilterButton,
  FilterButtonSize,
  SegmentedControl,
  SegmentedControlSize,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';

interface ChartTypeToggleProps {
  chartType?: ChartType;
  onChartTypeSelect?: (type: ChartType) => void;
}

const ChartTypeToggle: React.FC<ChartTypeToggleProps> = ({
  chartType,
  onChartTypeSelect,
}) => {
  if (!onChartTypeSelect) return null;

  return (
    <SegmentedControl
      value={chartType}
      onChange={(value) => onChartTypeSelect(value as ChartType)}
      size={SegmentedControlSize.Sm}
      isFullWidth
    >
      <FilterButton
        value={ChartType.Line}
        size={FilterButtonSize.Sm}
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
      </FilterButton>
      <FilterButton
        value={ChartType.Candles}
        size={FilterButtonSize.Sm}
        accessibilityLabel="Candlestick chart"
        accessibilityState={{ selected: chartType === ChartType.Candles }}
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
      </FilterButton>
    </SegmentedControl>
  );
};

export default ChartTypeToggle;
