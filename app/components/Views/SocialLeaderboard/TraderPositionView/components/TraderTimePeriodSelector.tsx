import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import type { TimePeriod } from '../useTraderPositionData';
import TimePeriodButton from './TimePeriodButton';

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
    twClassName="px-4 pb-3"
  >
    {timePeriods.map((period) => (
      <TimePeriodButton
        key={period}
        label={period}
        isActive={activeTimePeriod === period}
        onPress={() => onSelectPeriod(period)}
      />
    ))}
  </Box>
);

export default TraderTimePeriodSelector;
