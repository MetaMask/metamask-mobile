import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import type { TimePeriod } from '../useTraderPositionData';
import TimePeriodButton from './TimePeriodButton';
import TraderChartFitButton from './TraderChartFitButton';

export interface TraderTimePeriodSelectorProps {
  timePeriods: readonly TimePeriod[];
  activeTimePeriod: TimePeriod;
  onSelectPeriod: (period: TimePeriod) => void;
  /**
   * Fired when the trailing "fit" button is tapped — resets the chart zoom/pan
   * to its default fit range. Omit to hide the button (e.g. the legacy chart,
   * which has no zoomable viewport to reset).
   */
  onResetRange?: () => void;
  /** testID for the trailing fit button. */
  resetRangeTestID?: string;
}

const TraderTimePeriodSelector: React.FC<TraderTimePeriodSelectorProps> = ({
  timePeriods,
  activeTimePeriod,
  onSelectPeriod,
  onResetRange,
  resetRangeTestID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4 pt-3 pb-3"
  >
    {timePeriods.map((period) => (
      <TimePeriodButton
        key={period}
        label={period}
        isActive={activeTimePeriod === period}
        onPress={() => onSelectPeriod(period)}
      />
    ))}
    {onResetRange ? (
      <TraderChartFitButton onPress={onResetRange} testID={resetRangeTestID} />
    ) : null}
  </Box>
);

export default TraderTimePeriodSelector;
