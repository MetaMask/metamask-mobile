import React from 'react';
import {
  Icon,
  IconName,
  IconSize,
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
  SegmentedControl,
  SegmentedControlSize,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';

interface ChartTypeToggleProps {
  chartType?: ChartType;
  onChartTypeSelect?: (type: ChartType) => void;
  twClassName?: string;
}

const ChartTypeToggle: React.FC<ChartTypeToggleProps> = ({
  chartType,
  onChartTypeSelect,
  twClassName,
}) => {
  if (!onChartTypeSelect) return null;

  const handleChange = (value: string) => {
    const numValue = parseInt(value, 10) as ChartType;
    onChartTypeSelect(numValue);
  };

  const selectedValue = chartType ? chartType.toString() : '';

  return (
    <SegmentedControl
      value={selectedValue}
      onChange={handleChange}
      size={SegmentedControlSize.Sm}
      twClassName={twClassName}
    >
      <FilterButton
        value={ChartType.Line.toString()}
        size={FilterButtonSize.Sm}
        variant={FilterButtonVariant.Secondary}
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
        value={ChartType.Candles.toString()}
        size={FilterButtonSize.Sm}
        variant={FilterButtonVariant.Secondary}
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
