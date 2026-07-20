import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  ALERT_PERIODS,
  AlertPeriod,
  CreatePriceAlertTestIds,
} from '../constants';
import SlidingPillToggle from './SlidingPillToggle';

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
});

interface AlertPeriodToggleProps {
  value: AlertPeriod;
  onChange: (value: AlertPeriod) => void;
}

const periodTestId = (period: AlertPeriod) =>
  period === '24h'
    ? CreatePriceAlertTestIds.PERIOD_SEGMENT_24H
    : CreatePriceAlertTestIds.PERIOD_SEGMENT_1H;

/**
 * Small animated sliding-pill toggle for the percent-change rolling window
 * (24hr / 1hr).
 */
const AlertPeriodToggle: React.FC<AlertPeriodToggleProps> = ({
  value,
  onChange,
}) => {
  const { colors } = useTheme();
  const [firstPeriod, secondPeriod] = ALERT_PERIODS;
  const options = useMemo(
    () =>
      [
        {
          value: firstPeriod,
          label: strings(`price_alerts.period_${firstPeriod}`),
          testID: periodTestId(firstPeriod),
        },
        {
          value: secondPeriod,
          label: strings(`price_alerts.period_${secondPeriod}`),
          testID: periodTestId(secondPeriod),
        },
      ] as const,
    [firstPeriod, secondPeriod],
  );

  return (
    <SlidingPillToggle
      value={value}
      options={options}
      onChange={onChange}
      testID={CreatePriceAlertTestIds.PERIOD_SEGMENT}
      containerTwClassName="border border-muted rounded-full p-1 self-center"
      pillTwClassName="rounded-full px-3 py-0.5"
      sliderBackgroundColor={colors.background.defaultPressed}
      sliderBorderRadius={999}
      containerStyle={styles.container}
    />
  );
};

export default AlertPeriodToggle;
