import {
  Box,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Keyboard, Platform } from 'react-native';

export const getPerpsProInputAccessoryID = (testID: string) =>
  `${testID}-input-accessory`;

interface PerpsProCompactInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  testID: string;
  variant?: 'stacked' | 'inline';
  endAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  placeholder?: string;
  placeholderColor?: 'default' | 'muted';
}

const PerpsProCompactInput = ({
  label,
  value,
  onChangeText,
  testID,
  variant = 'stacked',
  endAccessory,
  footer,
  placeholder = '0',
  placeholderColor = 'muted',
}: PerpsProCompactInputProps) => {
  const tw = useTailwind();
  const inputAccessoryViewID =
    Platform.OS === 'ios' ? getPerpsProInputAccessoryID(testID) : undefined;

  const input = (
    <Input
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      returnKeyType="done"
      onSubmitEditing={Keyboard.dismiss}
      inputAccessoryViewID={inputAccessoryViewID}
      placeholder={placeholder}
      placeholderTextColor={tw.color(`text-${placeholderColor}`)}
      textVariant={TextVariant.BodySm}
      isStateStylesDisabled
      twClassName="flex-1 border-0 bg-transparent p-0 font-medium"
      testID={testID}
      accessibilityLabel={label}
    />
  );

  if (variant === 'inline') {
    return (
      <Box
        twClassName="h-12 flex-row items-center border-t border-muted px-3"
        testID={`${testID}-container`}
      >
        {input}
        {endAccessory}
      </Box>
    );
  }

  return (
    <Box twClassName="rounded-xl bg-muted p-3" testID={`${testID}-container`}>
      <Box twClassName="flex-row items-center justify-between">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {label}
        </Text>
        {endAccessory}
      </Box>
      {input}
      {footer}
    </Box>
  );
};

export default PerpsProCompactInput;
