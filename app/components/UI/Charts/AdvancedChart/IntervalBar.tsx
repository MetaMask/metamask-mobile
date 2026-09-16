import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';
import ChartTypeToggle from './ChartTypeToggle';
import { TOKEN_OVERVIEW_CHART_INTERVALS } from '../../AssetOverview/Price/tokenOverviewChart.constants';

interface IntervalBarProps {
  selectedInterval: string;
  onIntervalSelect?: (interval: string) => void;
  chartType?: ChartType;
  onChartTypeSelect?: (type: ChartType) => void;
  disabled?: boolean;
}

const IntervalBar: React.FC<IntervalBarProps> = ({
  selectedInterval,
  onIntervalSelect,
  chartType,
  onChartTypeSelect,
  disabled = false,
}) => {
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
        <FilterButtonGroup
          value={normalised}
          onChange={(value) => !disabled && onIntervalSelect?.(value.toUpperCase())}
          variant={FilterButtonVariant.Secondary}
          twClassName="flex-1"
        >
          {TOKEN_OVERVIEW_CHART_INTERVALS.map((interval) => (
            <FilterButton
              key={interval}
              value={interval}
              size={FilterButtonSize.Sm}
              twClassName="flex-1"
              accessibilityLabel={interval}
              isDisabled={disabled}
            >
              {interval}
            </FilterButton>
          ))}
        </FilterButtonGroup>
      </Box>

      <ChartTypeToggle
        chartType={chartType}
        onChartTypeSelect={onChartTypeSelect}
      />
    </Box>
  );
};

export default IntervalBar;
