import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconName,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useImperativeHandle, useRef } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  type KeyboardTypeOptions,
  type TextInput,
  type View,
} from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';

export const getPerpsProInputAccessoryID = (testID: string) =>
  `${testID}-input-accessory`;

export interface PerpsProInputKeyboardAccessoryProps {
  inputTestID: string;
  onPrevious?: () => void;
  onNext?: () => void;
}

export const PerpsProInputKeyboardAccessory = ({
  inputTestID,
  onPrevious,
  onNext,
}: PerpsProInputKeyboardAccessoryProps) => {
  const showsNavigation = Boolean(onPrevious || onNext);

  return Platform.OS === 'ios' ? (
    <InputAccessoryView nativeID={getPerpsProInputAccessoryID(inputTestID)}>
      <Box twClassName="flex-row items-center justify-between border-t border-muted bg-default px-3 py-2">
        {showsNavigation ? (
          <Box twClassName="flex-row gap-2">
            <ButtonIcon
              iconName={IconName.ArrowUp}
              size={ButtonIconSize.Md}
              variant={ButtonIconVariant.Filled}
              isDisabled={!onPrevious}
              onPress={onPrevious}
              testID={`${PerpsProOrderFormSelectorsIDs.KEYBOARD_PREVIOUS}-${inputTestID}`}
              accessibilityLabel={strings(
                'perps.pro_order_form.keyboard_previous',
              )}
            />
            <ButtonIcon
              iconName={IconName.ArrowDown}
              size={ButtonIconSize.Md}
              variant={ButtonIconVariant.Filled}
              isDisabled={!onNext}
              onPress={onNext}
              testID={`${PerpsProOrderFormSelectorsIDs.KEYBOARD_NEXT}-${inputTestID}`}
              accessibilityLabel={strings('perps.pro_order_form.keyboard_next')}
            />
          </Box>
        ) : (
          <Box />
        )}
        <ButtonBase
          size={ButtonBaseSize.Sm}
          onPress={Keyboard.dismiss}
          twClassName="h-10 rounded-lg bg-muted px-4"
          testID={`${PerpsProOrderFormSelectorsIDs.KEYBOARD_DONE}-${inputTestID}`}
        >
          {strings('perps.pro_order_form.keyboard_done')}
        </ButtonBase>
      </Box>
    </InputAccessoryView>
  ) : null;
};

export interface PerpsProCompactInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  testID: string;
  variant?: 'stacked' | 'inline' | 'inline-labeled';
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
  containerRef?: React.Ref<View>;
  isDisabled?: boolean;
  /**
   * Keeps the native input mounted so its iOS keyboard accessory can bind
   * before the field is shown. Hidden fields take no layout and ignore taps.
   */
  isHidden?: boolean;
}

const PerpsProCompactInput = React.forwardRef<
  TextInput | null,
  PerpsProCompactInputProps
>(
  (
    {
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
      containerRef,
      isDisabled = false,
      isHidden = false,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const inputRef = useRef<TextInput>(null);
    useImperativeHandle<TextInput | null, TextInput | null>(
      ref,
      () => inputRef.current,
      [],
    );
    const inputAccessoryViewID =
      Platform.OS === 'ios' ? getPerpsProInputAccessoryID(testID) : undefined;
    useEffect(() => {
      if (isHidden) {
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
    const focusInput = () => {
      if (isDisabled) {
        return;
      }
      inputRef.current?.focus();
      onFieldPress?.();
    };

    const input = (
      <Input
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        onFocus={onFocus}
        onBlur={onBlur}
        isDisabled={isDisabled}
        // A tap landing here is consumed by the input, so neither the inline
        // variant's wrapping pressable nor the stacked variant's label fires.
        onPressIn={onFieldPress}
        inputAccessoryViewID={inputAccessoryViewID}
        placeholder={placeholder}
        placeholderTextColor={tw.color(`text-${placeholderColor}`)}
        textVariant={TextVariant.BodySm}
        isStateStylesDisabled
        twClassName="flex-1 border-0 bg-transparent p-0"
        testID={testID}
        accessibilityLabel={label}
      />
    );

    if (variant === 'inline-labeled') {
      return (
        <Box
          ref={containerRef}
          twClassName={
            isHidden
              ? undefined
              : 'h-12 flex-row items-center border-t border-muted px-3'
          }
          testID={`${testID}-container`}
          {...hiddenProps}
        >
          <Pressable
            onPress={focusInput}
            disabled={isDisabled}
            accessible={false}
            style={tw`h-full min-w-0 flex-1 justify-center`}
            testID={`${testID}-field`}
          >
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              numberOfLines={labelNumberOfLines}
            >
              {label}
            </Text>
            <Box twClassName="flex-row items-center">
              {startAccessory}
              {input}
            </Box>
          </Pressable>
          {endAccessory}
        </Box>
      );
    }

    if (variant === 'inline') {
      return (
        <Box
          ref={containerRef}
          twClassName={
            isHidden
              ? undefined
              : 'h-12 flex-row items-center border-t border-muted px-3'
          }
          testID={`${testID}-container`}
          {...hiddenProps}
        >
          {/* The input's text occupies only ~20px of this 48px row, so most of
            the row is dead space. Without a pressable filling it, taps there
            reach the enclosing ScrollView instead, and its
            `keyboardShouldPersistTaps="handled"` treats an unhandled tap as a
            request to dismiss the keyboard. `endAccessory` stays outside so the
            mid-price button keeps its own press. */}
          <Pressable
            onPress={focusInput}
            disabled={isDisabled}
            accessible={false}
            style={tw`h-full min-w-0 flex-1 flex-row items-center`}
            testID={`${testID}-field`}
          >
            {startAccessory}
            {input}
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
          <Pressable onPress={focusInput} disabled={isDisabled}>
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
  },
);

PerpsProCompactInput.displayName = 'PerpsProCompactInput';

export default PerpsProCompactInput;
