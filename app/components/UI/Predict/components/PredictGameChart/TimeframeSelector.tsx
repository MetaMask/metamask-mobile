import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  type FilterButtonGroupProps,
} from '@metamask/design-system-react-native';
import {
  ChartTimeframe,
  TimeframeSelectorProps,
} from './PredictGameChart.types';

const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: '6h', label: '6H' },
  { value: '1d', label: '1D' },
  { value: 'max', label: 'Max' },
];

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selected,
  onSelect,
  disabled = false,
}) => {
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="justify-center gap-2 pt-2 px-4"
    >
      <FilterButtonGroup
        value={selected}
        onChange={(value) => !disabled && onSelect(value as ChartTimeframe)}
        variant={FilterButtonVariant.Secondary}
        twClassName="flex-1"
      >
        {TIMEFRAMES.map(({ value, label }) => (
          <FilterButton
            key={value}
            value={value}
            size={FilterButtonSize.Sm}
            twClassName="flex-1"
            isDisabled={disabled}
          >
            {label}
          </FilterButton>
        ))}
      </FilterButtonGroup>
    </Box>
  );
};

export default TimeframeSelector;
