import React from 'react';
import { View } from 'react-native';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import KeypadComponent, {
  type KeypadChangeData,
} from '../../../../Base/Keypad';
import RecurringToggle from './RecurringToggle';
import { CreatePriceAlertTestIds } from '../constants';

interface AlertFormShellProps {
  children: React.ReactNode;
  /** Optional content between RecurringToggle and the keypad (e.g. quick % pills). */
  footerAccessory?: React.ReactNode;
  isRecurring: boolean;
  onRecurringChange: (value: boolean) => void;
  keypadValue: string;
  onKeypadChange: (data: KeypadChangeData) => void;
  keypadDecimals: number;
  saveButtonLabel: string;
  onSave: () => void;
  isSubmitting: boolean;
  isSaveDisabled: boolean;
}

/**
 * Shared create/edit chrome: centered header slot, recurring toggle, keypad,
 * and primary save button. Forms own validation and pass label / disabled.
 *
 * "price_alert" is intentionally not in the Keypad CURRENCIES map — unknown
 * codes fall through to the decimals-aware branch in useCurrency, which is
 * the only path that actually enforces the decimals cap.
 */
const AlertFormShell: React.FC<AlertFormShellProps> = ({
  children,
  footerAccessory,
  isRecurring,
  onRecurringChange,
  keypadValue,
  onKeypadChange,
  keypadDecimals,
  saveButtonLabel,
  onSave,
  isSubmitting,
  isSaveDisabled,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="flex-1">
      <Box twClassName="flex-1 justify-center px-4 pb-4">{children}</Box>

      <View style={tw.style('px-4 pb-2')}>
        <RecurringToggle
          value={isRecurring}
          onValueChange={onRecurringChange}
        />
        {footerAccessory}
        <KeypadComponent
          value={keypadValue}
          onChange={onKeypadChange}
          currency="price_alert"
          decimals={keypadDecimals}
        />
        <Button
          variant={ButtonVariant.Primary}
          onPress={onSave}
          isLoading={isSubmitting}
          isDisabled={isSubmitting || isSaveDisabled}
          testID={CreatePriceAlertTestIds.SET_ALERT_BUTTON}
          twClassName="mt-3 w-full"
        >
          {saveButtonLabel}
        </Button>
      </View>
    </Box>
  );
};

export default AlertFormShell;
