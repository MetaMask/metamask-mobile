import React from 'react';
import { StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { AlertType, CreatePriceAlertTestIds } from '../constants';
import SlidingPillToggle from './SlidingPillToggle';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
});

const options = [
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
] as const;

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

  return (
    <SlidingPillToggle
      value={value}
      options={options}
      onChange={onChange}
      isDisabled={isDisabled}
      testID={CreatePriceAlertTestIds.TYPE_SEGMENT}
      inset={4}
      containerBorderRadius={12}
      pillBorderRadius={10}
      containerBorderColor={colors.border.muted}
      sliderBackgroundColor={colors.background.muted}
      pillPaddingHorizontal={12}
      pillPaddingVertical={8}
      weightBySelection
      stretchPills
      style={styles.container}
    />
  );
};

export default AlertTypeToggle;
