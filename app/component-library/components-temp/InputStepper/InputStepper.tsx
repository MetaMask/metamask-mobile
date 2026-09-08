import React, { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconColor,
  IconName,
  Text,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Input from '../../components/Form/TextField/foundation/Input';
import { formatAmountWithLocaleSeparators } from '../../../util/formatAmountWithLocaleSeparators';
import { calculateInputFontSize } from './calculateInputFontSize';
import {
  INPUTSTEPPER_INPUT_TESTID,
  INPUTSTEPPER_MINUS_BUTTON_TESTID,
  INPUTSTEPPER_PLUS_BUTTON_TESTID,
  INPUTSTEPPER_POST_VALUE_TESTID,
  INPUTSTEPPER_TESTID,
} from './InputStepper.constants';
import { InputStepperDescriptionRow } from './InputStepperDescriptionRow';
import { InputStepperProps } from './InputStepper.types';

/**
 * Numeric stepper with optional suffix, keypad-driven caret, and description row.
 *
 * Uses component-library `Input` instead of MMDS `Input` because this package
 * version of `@metamask/design-system-react-native` does not export `Input`,
 * and the keypad flow requires `selection`, `showSoftInputOnFocus={false}`,
 * and `caretHidden={false}`.
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
  selection,
  onSelectionChange,
  testID = INPUTSTEPPER_TESTID,
}) => {
  const tw = useTailwind();
  const fontSize = calculateInputFontSize(value.length);
  const [minusPressed, setMinusPressed] = useState(false);
  const [plusPressed, setPlusPressed] = useState(false);
  const displayedAmount = useMemo(
    () => formatAmountWithLocaleSeparators(value),
    [value],
  );

  const inputTextStyle = useMemo(() => {
    const sizeStyle = {
      backgroundColor: 'transparent',
      borderWidth: 0,
      fontSize,
      lineHeight: fontSize * 1.25,
      height: fontSize * 1.25,
    };

    if (Platform.OS !== 'android') {
      return sizeStyle;
    }

    return {
      ...sizeStyle,
      includeFontPadding: false,
      textAlignVertical: 'center' as const,
      paddingVertical: 0,
      paddingTop: 1,
    };
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
        />
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-[100px]"
        >
          <Input
            showSoftInputOnFocus={false}
            caretHidden={false}
            autoFocus
            placeholder={placeholder}
            value={displayedAmount}
            style={inputTextStyle}
            testID={INPUTSTEPPER_INPUT_TESTID}
            selection={selection}
            onSelectionChange={onSelectionChange}
          />
          {postValue ? (
            <Text
              style={inputTextStyle}
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
        />
      </Box>
      <InputStepperDescriptionRow description={description} />
    </Box>
  );
};

export default InputStepper;
