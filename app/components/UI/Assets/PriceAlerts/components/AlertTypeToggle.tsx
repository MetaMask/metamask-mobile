import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { AlertType, CreatePriceAlertTestIds } from '../constants';
import SlidingPillToggle from './SlidingPillToggle';

interface AlertTypeToggleProps {
  value: AlertType;
  onChange: (value: AlertType) => void;
  /** Locks the toggle — type is immutable once an alert exists (edit mode). */
  isDisabled?: boolean;
}

/**
 * Animated sliding-pill toggle for price alert type selection.
 */
const AlertTypeToggle: React.FC<AlertTypeToggleProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const { colors } = useTheme();
  const options = useMemo(
    () =>
      [
        {
          value: 'absolute_price' as const,
          label: strings('price_alerts.price_target'),
          testID: CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET,
        },
        {
          value: 'percent_change' as const,
          label: strings('price_alerts.price_change'),
          testID: CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE,
        },
      ] as const,
    [],
  );

  return (
    <SlidingPillToggle
      value={value}
      options={options}
      onChange={onChange}
      isDisabled={isDisabled}
      testID={CreatePriceAlertTestIds.TYPE_SEGMENT}
      containerTwClassName="mx-4 border border-muted rounded-xl p-1"
      pillTwClassName="rounded-[10px] px-3 py-2"
      sliderBackgroundColor={colors.background.muted}
      sliderBorderRadius={10}
      equalWidthPills
      weightBySelection
    />
  );
};

export default AlertTypeToggle;
