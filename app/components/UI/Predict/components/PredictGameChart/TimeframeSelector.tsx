import React from 'react';
import {
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
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
  twClassName,
}) => (
  <FilterButtonGroup
    value={selected}
    onChange={(value) => onSelect(value as ChartTimeframe)}
    variant={FilterButtonVariant.Secondary}
    twClassName={`w-full justify-between pt-2 ${twClassName ?? ''}`}
  >
    {TIMEFRAMES.map(({ value, label }) => (
      <FilterButton
        key={value}
        value={value}
        size={FilterButtonSize.Sm}
        isDisabled={disabled}
      >
        {label}
      </FilterButton>
    ))}
  </FilterButtonGroup>
);

export default TimeframeSelector;
