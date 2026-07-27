import React from 'react';
import { Switch, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import KeypadComponent, {
  type KeypadChangeData,
} from '../../../../Base/Keypad';
import { CreatePriceAlertTestIds } from '../constants';

interface AlertFormShellProps {
  children: React.ReactNode;
  /** Optional content between the recurring toggle and the keypad (e.g. quick % pills). */
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
  const { colors, brandColors } = useTheme();

  return (
    <Box twClassName="flex-1">
      <Box twClassName="flex-1 justify-center px-4 pb-4">{children}</Box>

      <View style={tw.style('px-4 pb-2')}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-3 px-2"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('price_alerts.recurring')}
          </Text>
          <Switch
            value={isRecurring}
            onValueChange={onRecurringChange}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={brandColors.white}
            ios_backgroundColor={colors.border.muted}
            testID={CreatePriceAlertTestIds.RECURRING_TOGGLE}
          />
        </Box>
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
