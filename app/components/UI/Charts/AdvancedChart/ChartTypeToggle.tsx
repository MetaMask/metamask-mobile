import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Icon,
  IconName,
  IconSize,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';

interface ChartTypeToggleProps {
  chartType?: ChartType;
  onChartTypeSelect?: (type: ChartType) => void;
  /** Outer container classes; defaults to time-range row spacing. */
  containerTwClassName?: string;
}

const DEFAULT_CONTAINER_CLASS =
  'ml-2 rounded-lg border border-border-muted p-0.5';

const ChartTypeToggle: React.FC<ChartTypeToggleProps> = ({
  chartType,
  onChartTypeSelect,
  containerTwClassName = DEFAULT_CONTAINER_CLASS,
}) => {
  if (!onChartTypeSelect) return null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={containerTwClassName}
    >
      <FilterButtonGroup
        value={chartType}
        onChange={(value) => onChartTypeSelect(value as ChartType)}
        variant={FilterButtonVariant.Primary}
        twClassName="w-full rounded-lg"
      >
        <FilterButton
          value={ChartType.Line}
          size={FilterButtonSize.Sm}
          twClassName="flex-1"
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
          twClassName="flex-1"
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
      </FilterButtonGroup>
    </Box>
  );
};

export default ChartTypeToggle;
