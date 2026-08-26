import {
  Box,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  type KeyboardTypeOptions,
  type TextInput,
} from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';

export const getPerpsProInputAccessoryID = (testID: string) =>
  `${testID}-input-accessory`;

export const PerpsProInputKeyboardAccessory = ({
  inputTestID,
}: {
  inputTestID: string;
}) =>
  Platform.OS === 'ios' ? (
    <InputAccessoryView nativeID={getPerpsProInputAccessoryID(inputTestID)}>
      <Box
        twClassName="border-t border-muted bg-default px-3 py-2"
        alignItems={BoxAlignItems.End}
      >
        <ButtonIcon
          iconName={IconName.ArrowDown}
          size={ButtonIconSize.Sm}
          onPress={Keyboard.dismiss}
          testID={`${PerpsProOrderFormSelectorsIDs.KEYBOARD_CLOSE}-${inputTestID}`}
          accessibilityLabel={strings('perps.pro_order_form.close_keyboard')}
        />
      </Box>
    </InputAccessoryView>
  ) : null;

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
  keyboardType?: KeyboardTypeOptions;
  labelVariant?: TextVariant;
  labelNumberOfLines?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Fires on every field tap, including while already focused. Idempotent. */
  onFieldPress?: () => void;
  /**
   * Keeps the native input mounted so its iOS keyboard accessory can bind
   * before the field is shown. Hidden fields take no layout and ignore taps.
   */
  isHidden?: boolean;
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
  keyboardType = 'decimal-pad',
  labelVariant = TextVariant.BodySm,
  labelNumberOfLines,
  onFocus,
  onBlur,
  onFieldPress,
  isHidden = false,
}: PerpsProCompactInputProps) => {
  const tw = useTailwind();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isInlineActive = isFocused || value.length > 0;
  const isInputVisible = variant !== 'inline' || isInlineActive;
  const inputAccessoryViewID =
    Platform.OS === 'ios' ? getPerpsProInputAccessoryID(testID) : undefined;
  useEffect(() => {
    if (isHidden) {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, [isHidden]);

  const hiddenProps = isHidden
    ? ({
        pointerEvents: 'none' as const,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants' as const,
        style: { height: 0, overflow: 'hidden' as const, opacity: 0 },
      } as const)
    : undefined;
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };
  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };
  const handleFieldPress = () => {
    setIsFocused(true);
    onFieldPress?.();
  };
  const focusInput = () => {
    inputRef.current?.focus();
    handleFieldPress();
  };

  const input = (
    <Input
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // A tap landing here is consumed by the input, so neither the inline
      // variant's wrapping pressable nor the stacked variant's label fires.
      onPressIn={handleFieldPress}
      inputAccessoryViewID={inputAccessoryViewID}
      placeholder={isInputVisible ? placeholder : ''}
      placeholderTextColor={tw.color(`text-${placeholderColor}`)}
      textVariant={TextVariant.BodySm}
      isStateStylesDisabled
      twClassName={
        isInputVisible
          ? 'flex-1 border-0 bg-transparent p-0'
          : 'absolute h-1 w-1 opacity-0'
      }
      testID={testID}
      accessibilityLabel={label}
    />
  );

  if (variant === 'inline') {
    return (
      <Box
        twClassName={
          isHidden
            ? undefined
            : 'h-[54px] flex-row items-center border-t border-muted px-3 py-1'
        }
        testID={`${testID}-container`}
        {...hiddenProps}
      >
        {/* Keep the input area separate from the Mid action so the whole field
            can focus without making the Mid action focus the input. */}
        <Pressable
          onPress={focusInput}
          accessible={false}
          style={tw`h-full min-w-0 flex-1 justify-center`}
          testID={`${testID}-field`}
        >
          <Text
            variant={isInlineActive ? TextVariant.BodyXs : TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={`${testID}-label`}
          >
            {label}
          </Text>
          <Box
            twClassName={
              isInlineActive
                ? 'w-full flex-row items-center'
                : 'absolute h-0 w-0 overflow-hidden'
            }
          >
            {/* Keep the accessory slot stable so activating the field does not
                remount the focused native input. */}
            <Box
              twClassName={
                isInlineActive ? 'shrink-0' : 'h-0 w-0 overflow-hidden'
              }
            >
              {startAccessory}
            </Box>
            {input}
          </Box>
        </Pressable>
        {endAccessory}
      </Box>
    );
  }

  return (
    <Box
      twClassName={isHidden ? undefined : 'rounded-xl bg-muted p-3'}
      testID={`${testID}-container`}
      {...hiddenProps}
    >
      <Box twClassName="flex-row items-center justify-between">
        {/* Tapping the label focuses the input and opens the keyboard, same
            as tapping the (visually small) input row itself. */}
        <Pressable onPress={focusInput}>
          <Text
            variant={labelVariant}
            color={TextColor.TextAlternative}
            numberOfLines={labelNumberOfLines}
          >
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
