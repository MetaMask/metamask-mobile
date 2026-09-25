import React, { useCallback, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconColor,
  IconName,
  Input,
  Text,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { inputStepperStyles } from './styles';
import { INPUT_CARET_WIDTH } from './constants';
import { calculateInputFontSize } from '../../utils/calculateInputFontSize';
import { InputStepperProps } from './types';
import { InputStepperDescriptionRow } from './InputStepperDescriptionRow';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';

export const InputStepper = ({
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
}: InputStepperProps) => {
  const fontSize = calculateInputFontSize(value.length);
  const { styles } = useStyles(inputStepperStyles, { fontSize });
  const tw = useTailwind();
  const [minusPressed, setMinusPressed] = useState(false);
  const [plusPressed, setPlusPressed] = useState(false);
  const [textWidth, setTextWidth] = useState<number>();
  const displayedAmount = useMemo(
    () => formatAmountWithLocaleSeparators(value),
    [value],
  );

  const handleMeasuredTextLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) =>
      setTextWidth(nativeEvent.layout.width),
    [],
  );

  const inputStyle = useMemo(
    () =>
      textWidth === undefined
        ? styles.input
        : { ...styles.input, width: textWidth + INPUT_CARET_WIDTH },
    [styles.input, textWidth],
  );

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
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
          testID="input-stepper-minus-button"
        />
        <View style={styles.inputRow}>
          <Text
            style={styles.input}
            numberOfLines={1}
            onLayout={handleMeasuredTextLayout}
            pointerEvents="none"
            twClassName="absolute opacity-0"
            testID="input-stepper-measured-text"
          >
            {displayedAmount || placeholder}
          </Text>
          <View>
            <Input
              showSoftInputOnFocus={false}
              caretHidden={false}
              autoFocus
              placeholder={placeholder}
              value={displayedAmount}
              style={inputStyle}
              testID="input-stepper-input"
              // Slippage controls selection so keypad edits can target the
              // displayed caret position instead of always appending.
              selection={selection}
              onSelectionChange={onSelectionChange}
            />
          </View>
          {postValue && (
            <View testID="input-stepper-post-value">
              <Text style={styles.input}>{postValue}</Text>
            </View>
          )}
        </View>
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
          testID="input-stepper-plus-button"
        />
      </View>
      <InputStepperDescriptionRow description={description} />
    </View>
  );
};
