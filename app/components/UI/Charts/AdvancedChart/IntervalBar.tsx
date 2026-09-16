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
}

const IntervalBar: React.FC<IntervalBarProps> = ({
  selectedInterval,
  onIntervalSelect,
  chartType,
  onChartTypeSelect,
}) => {
  const normalised = selectedInterval.toLowerCase();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full px-4"
    >
      <FilterButtonGroup
        value={normalised}
        onChange={(value) => onIntervalSelect?.(value.toUpperCase())}
        variant={FilterButtonVariant.Primary}
        twClassName="flex-1 gap-1"
      >
        {TOKEN_OVERVIEW_CHART_INTERVALS.map((interval) => (
          <FilterButton
            key={interval}
            value={interval}
            size={FilterButtonSize.Sm}
          >
            {interval}
          </FilterButton>
        ))}
      </FilterButtonGroup>

      <ChartTypeToggle
        chartType={chartType}
        onChartTypeSelect={onChartTypeSelect}
        containerTwClassName="shrink-0 rounded-lg border border-border-muted p-0.5"
      />
    </Box>
  );
};

export default IntervalBar;
