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
} from '@metamask/design-system-react-native';
import type { TimePeriod } from '../useTraderPositionData';

export interface TraderTimePeriodSelectorProps {
  timePeriods: readonly TimePeriod[];
  activeTimePeriod: TimePeriod;
  onSelectPeriod: (period: TimePeriod) => void;
}

const TraderTimePeriodSelector: React.FC<TraderTimePeriodSelectorProps> = ({
  timePeriods,
  activeTimePeriod,
  onSelectPeriod,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4 pt-3 pb-3"
  >
    <FilterButtonGroup
      value={activeTimePeriod}
      onChange={(value) => onSelectPeriod(value as TimePeriod)}
      variant={FilterButtonVariant.Primary}
      twClassName="flex-1 rounded-full"
    >
      {timePeriods.map((period) => (
        <FilterButton
          key={period}
          value={period}
          size={FilterButtonSize.Sm}
          twClassName="flex-1 rounded-full"
        >
          {period}
        </FilterButton>
      ))}
    </FilterButtonGroup>
  </Box>
);

export default TraderTimePeriodSelector;
