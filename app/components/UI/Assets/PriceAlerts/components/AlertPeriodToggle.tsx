import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  ALERT_PERIODS,
  AlertPeriod,
  CreatePriceAlertTestIds,
} from '../constants';
import SlidingPillToggle from './SlidingPillToggle';

interface AlertPeriodToggleProps {
  value: AlertPeriod;
  onChange: (value: AlertPeriod) => void;
}

const [firstPeriod, secondPeriod] = ALERT_PERIODS;

const options = [
  {
    value: firstPeriod,
    label: strings(`price_alerts.period_${firstPeriod}`),
    testID: CreatePriceAlertTestIds.PERIOD_SEGMENT_24H,
  },
  {
    value: secondPeriod,
    label: strings(`price_alerts.period_${secondPeriod}`),
    testID: CreatePriceAlertTestIds.PERIOD_SEGMENT_1H,
  },
] as const;

/**
 * Small animated sliding-pill toggle for the percent-change rolling window
 * (24hr / 1hr).
 */
const AlertPeriodToggle: React.FC<AlertPeriodToggleProps> = ({
  value,
  onChange,
}) => {
  const { colors } = useTheme();

  return (
    <SlidingPillToggle
      value={value}
      options={options}
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
