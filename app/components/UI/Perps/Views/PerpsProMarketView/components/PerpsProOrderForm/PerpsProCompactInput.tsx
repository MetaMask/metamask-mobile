import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Keyboard, Platform } from 'react-native';
export const PERPS_PRO_INPUT_ACCESSORY_ID =
  'perps-pro-order-form-input-accessory';
interface PerpsProCompactInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  testID: string;
  endAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  placeholder?: string;
}
const PerpsProCompactInput = ({
  label,
  value,
  onChangeText,
  testID,
  endAccessory,
  footer,
  placeholder = '0',
}: PerpsProCompactInputProps) => {
  const inputAccessoryViewID =
    Platform.OS === 'ios' ? PERPS_PRO_INPUT_ACCESSORY_ID : undefined;
  return (
    <Box twClassName="rounded-xl bg-muted p-3" testID={`${testID}-container`}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {label}
        </Text>
        {endAccessory}
      </Box>
      <Input
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        inputAccessoryViewID={inputAccessoryViewID}
        placeholder={placeholder}
        isStateStylesDisabled
        twClassName="border-0 bg-transparent p-0"
        testID={testID}
        accessibilityLabel={label}
      />
      {footer}
    </Box>
  );
};
export default PerpsProCompactInput;
