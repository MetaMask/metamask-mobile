import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Input from '../../../../../component-library/components/Form/TextField/foundation/Input';
import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  IconColor,
  IconName,
  Text,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { inputStepperStyles } from './styles';
import { calculateInputFontSize } from '../../utils/calculateInputFontSize';
import { InputStepperProps } from './types';
import { InputStepperDescriptionRow } from './InputStepperDescriptionRow';
import { InputStepperTestIds } from './InputStepper.testIds';
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
  const displayedAmount = useMemo(
    () => formatAmountWithLocaleSeparators(value),
    [value],
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
          testID={InputStepperTestIds.MINUS_BUTTON}
        />
        <View style={styles.inputRow}>
          <View>
            <Input
              showSoftInputOnFocus={false}
              caretHidden={false}
              autoFocus
              placeholder={placeholder}
              value={displayedAmount}
              style={styles.input}
              testID={InputStepperTestIds.INPUT}
              // Slippage controls selection so keypad edits can target the
              // displayed caret position instead of always appending.
              selection={selection}
              onSelectionChange={onSelectionChange}
            />
          </View>
          {postValue && (
            <View testID={InputStepperTestIds.POST_VALUE}>
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
          testID={InputStepperTestIds.PLUS_BUTTON}
        />
      </View>
      <InputStepperDescriptionRow description={description} />
    </View>
  );
};
