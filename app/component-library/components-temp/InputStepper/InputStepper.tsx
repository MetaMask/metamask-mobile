import React, { useMemo, useState } from 'react';
import { Platform, TextStyle } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  HelpText,
  IconColor,
  IconName,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { formatAmountWithLocaleSeparators } from '../../../util/formatAmountWithLocaleSeparators';
import { calculateInputFontSize } from './calculateInputFontSize';
import {
  INPUTSTEPPER_DESCRIPTION_TESTID,
  INPUTSTEPPER_INPUT_TESTID,
  INPUTSTEPPER_MINUS_BUTTON_TESTID,
  INPUTSTEPPER_PLUS_BUTTON_TESTID,
  INPUTSTEPPER_POST_VALUE_TESTID,
  INPUTSTEPPER_TESTID,
} from './InputStepper.constants';
import { InputStepperCursor } from './InputStepperCursor';
import { InputStepperProps } from './InputStepper.types';

/**
 * Numeric stepper with optional suffix and description row.
 *
 * The amount is rendered as text with a blinking cursor rather than a
 * `TextInput`, matching the Send amount field. The keypad owns the value, so
 * the suffix stays flush with the digits and the amount cannot clip or scroll
 * mid-edit the way a focused `TextInput` does.
 */
const InputStepper: React.FC<InputStepperProps> = ({
  value,
  onDecrease,
  onIncrease,
  description,
  minAmount,
  maxAmount,
  postValue,
  placeholder = '0',
  testID = INPUTSTEPPER_TESTID,
  decreaseButtonProps,
  increaseButtonProps,
}) => {
  const tw = useTailwind();
  const [minusPressed, setMinusPressed] = useState(false);
  const [plusPressed, setPlusPressed] = useState(false);

  const displayedAmount = useMemo(
    () => (value ? formatAmountWithLocaleSeparators(value) : placeholder),
    [placeholder, value],
  );
  const fontSize = calculateInputFontSize(
    displayedAmount.length + (postValue?.length ?? 0),
  );

  const amountTextStyle = useMemo<TextStyle>(() => {
    const sizeStyle: TextStyle = {
      fontSize,
      lineHeight: fontSize * 1.25,
    };

    return Platform.OS === 'android'
      ? { ...sizeStyle, includeFontPadding: false }
      : sizeStyle;
  }, [fontSize]);

  return (
    <Box twClassName="gap-4" testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-around"
      >
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.Minus}
          variant={ButtonIconVariant.Floating}
          style={tw.style(minusPressed ? 'bg-muted-pressed' : 'bg-muted')}
          iconProps={{ color: IconColor.IconDefault }}
          onPressIn={() => setMinusPressed(true)}
          onPressOut={() => setMinusPressed(false)}
          onPress={onDecrease}
          isDisabled={parseFloat(value) <= minAmount}
          testID={INPUTSTEPPER_MINUS_BUTTON_TESTID}
          {...decreaseButtonProps}
        />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="min-w-[100px] shrink px-2"
        >
          <Text
            style={amountTextStyle}
            color={value ? TextColor.TextDefault : TextColor.TextMuted}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
            adjustsFontSizeToFit
            testID={INPUTSTEPPER_INPUT_TESTID}
          >
            {displayedAmount}
          </Text>
          <InputStepperCursor height={fontSize} />
          {postValue ? (
            <Text
              style={amountTextStyle}
              fontWeight={FontWeight.Bold}
              numberOfLines={1}
              adjustsFontSizeToFit
              testID={INPUTSTEPPER_POST_VALUE_TESTID}
            >
              {postValue}
            </Text>
          ) : null}
        </Box>
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.Add}
          variant={ButtonIconVariant.Floating}
          style={tw.style(plusPressed ? 'bg-muted-pressed' : 'bg-muted')}
          iconProps={{ color: IconColor.IconDefault }}
          onPressIn={() => setPlusPressed(true)}
          onPressOut={() => setPlusPressed(false)}
          onPress={onIncrease}
          isDisabled={parseFloat(value) >= maxAmount}
          testID={INPUTSTEPPER_PLUS_BUTTON_TESTID}
          {...increaseButtonProps}
        />
      </Box>
      {description ? (
        <Box alignItems={BoxAlignItems.Center}>
          <HelpText
            severity={description.severity}
            showIcon={description.showIcon}
            testID={description.testID ?? INPUTSTEPPER_DESCRIPTION_TESTID}
          >
            {description.message}
          </HelpText>
        </Box>
      ) : null}
    </Box>
  );
};

export default InputStepper;
