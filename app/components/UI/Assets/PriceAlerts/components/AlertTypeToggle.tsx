import React, { useCallback } from 'react';
import {
  Icon,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { type AlertType, CreatePriceAlertTestIds } from '../constants';

interface AlertTypeToggleProps {
  value: AlertType;
  onChange: (value: AlertType) => void;
  /** Locks the toggle — type is immutable once an alert exists (edit mode). */
  isDisabled?: boolean;
}

/**
 * Compact alert-type control. Shows the active mode and swaps on press.
 */
const AlertTypeToggle: React.FC<AlertTypeToggleProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const label =
    value === 'absolute_price'
      ? strings('price_alerts.price_target')
      : strings('price_alerts.price_change');

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    playSelection();
    onChange(value === 'absolute_price' ? 'percent_change' : 'absolute_price');
  }, [isDisabled, onChange, value]);

  return (
    <SelectButton
      testID={CreatePriceAlertTestIds.TYPE_SEGMENT}
      variant={SelectButtonVariant.Primary}
      size={SelectButtonSize.Md}
      placeholder={label}
      value={label}
      accessibilityLabel={label}
      isDisabled={isDisabled}
      onPress={handlePress}
      hideEndArrow
      endAccessory={
        <Icon
          name={IconName.SwapHorizontal}
          size={IconSize.Sm}
          testID={CreatePriceAlertTestIds.TYPE_SEGMENT_ICON}
        />
      }
    />
  );
};

export default AlertTypeToggle;
