import {
  Box,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useRef } from 'react';
import { Keyboard, Platform, Pressable, type TextInput } from 'react-native';

export const getPerpsProInputAccessoryID = (testID: string) =>
  `${testID}-input-accessory`;

interface PerpsProCompactInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  testID: string;
  variant?: 'stacked' | 'inline';
  startAccessory?: React.ReactNode;
  endAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  placeholder?: string;
  placeholderColor?: 'default' | 'muted';
  onFocus?: () => void;
  onBlur?: () => void;
}

const PerpsProCompactInput = ({
  label,
  value,
  onChangeText,
  testID,
  variant = 'stacked',
  startAccessory,
  endAccessory,
  footer,
  placeholder = '0',
  placeholderColor = 'muted',
  onFocus,
  onBlur,
}: PerpsProCompactInputProps) => {
  const tw = useTailwind();
  const inputRef = useRef<TextInput>(null);
  const inputAccessoryViewID =
    Platform.OS === 'ios' ? getPerpsProInputAccessoryID(testID) : undefined;
  const focusInput = () => inputRef.current?.focus();

  const input = (
    <Input
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      returnKeyType="done"
      onSubmitEditing={Keyboard.dismiss}
      onFocus={onFocus}
      onBlur={onBlur}
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
        {startAccessory}
        {input}
        {endAccessory}
      </Box>
    );
  }

  return (
    <Box twClassName="rounded-xl bg-muted p-3" testID={`${testID}-container`}>
      <Box twClassName="flex-row items-center justify-between">
        {/* Tapping the label focuses the input and opens the keyboard, same
            as tapping the (visually small) input row itself. */}
        <Pressable onPress={focusInput}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {label}
          </Text>
        </Pressable>
        {endAccessory}
      </Box>
      <Box twClassName="flex-row items-center">
        {startAccessory}
        {input}
      </Box>
      {footer ? (
        <Box twClassName="mt-3" testID={`${testID}-footer`}>
          {footer}
        </Box>
      ) : null}
    </Box>
  );
};

export default PerpsProCompactInput;
