import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  type FilterButtonGroupProps,
} from '@metamask/design-system-react-native';
import type { TimePeriod } from '../useTraderPositionData';

export interface TraderTimePeriodSelectorProps {
  timePeriods: readonly TimePeriod[];
  activeTimePeriod: TimePeriod;
  onSelectPeriod: (period: TimePeriod) => void;
  twClassName?: FilterButtonGroupProps['twClassName'];
}

const TraderTimePeriodSelector: React.FC<TraderTimePeriodSelectorProps> = ({
  timePeriods,
  activeTimePeriod,
  onSelectPeriod,
  twClassName,
}) => (
  <FilterButtonGroup
    value={activeTimePeriod}
    onChange={(value) => onSelectPeriod(value as TimePeriod)}
    variant={FilterButtonVariant.Secondary}
    twClassName={twClassName}
  >
    {timePeriods.map((period) => (
      <FilterButton
        key={period}
        value={period}
        size={FilterButtonSize.Sm}
        twClassName="flex-1 px-2 min-w-8"
      >
        {period}
      </FilterButton>
    ))}
  </FilterButtonGroup>
);

export default TraderTimePeriodSelector;
