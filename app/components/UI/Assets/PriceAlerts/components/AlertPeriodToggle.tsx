import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  ALERT_PERIODS,
  AlertPeriod,
  CreatePriceAlertTestIds,
  PERP_ALERT_PERIODS,
} from '../constants';
import SlidingPillToggle from './SlidingPillToggle';

interface AlertPeriodToggleProps {
  value: AlertPeriod;
  onChange: (value: AlertPeriod) => void;
  includeFiveMinutes?: boolean;
}

const PERIOD_TEST_IDS = {
  '5m': CreatePriceAlertTestIds.PERIOD_SEGMENT_5M,
  '1h': CreatePriceAlertTestIds.PERIOD_SEGMENT_1H,
  '24h': CreatePriceAlertTestIds.PERIOD_SEGMENT_24H,
} as const;

const createOption = (period: AlertPeriod) => ({
  value: period,
  label: strings(`price_alerts.period_${period}`),
  testID: PERIOD_TEST_IDS[period],
});

const spotOptions = ALERT_PERIODS.map(createOption) as [
  ReturnType<typeof createOption>,
  ReturnType<typeof createOption>,
];
const perpOptions = PERP_ALERT_PERIODS.map(createOption) as [
  ReturnType<typeof createOption>,
  ReturnType<typeof createOption>,
  ...ReturnType<typeof createOption>[],
];

/**
 * Small animated sliding-pill toggle for the percent-change rolling window
 * (24hr / 1hr, plus 5min for perpetuals).
 */
const AlertPeriodToggle: React.FC<AlertPeriodToggleProps> = ({
  value,
  onChange,
  includeFiveMinutes = false,
}) => {
  const { colors } = useTheme();

  return (
    <SlidingPillToggle
      value={value}
      options={includeFiveMinutes ? perpOptions : spotOptions}
      onChange={onChange}
      testID={CreatePriceAlertTestIds.PERIOD_SEGMENT}
      inset={4}
      containerBorderRadius={999}
      pillBorderRadius={999}
      containerBorderColor={colors.border.muted}
      sliderBackgroundColor={colors.background.defaultPressed}
      pillPaddingHorizontal={12}
      pillPaddingVertical={2}
    />
  );
};

export default AlertPeriodToggle;
