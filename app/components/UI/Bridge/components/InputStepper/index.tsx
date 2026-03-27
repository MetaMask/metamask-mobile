import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Input from '../../../../../component-library/components/Form/TextField/foundation/Input';
import {
  ButtonIcon,
  ButtonIconSize,
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
          isFloating
          style={tw.style(minusPressed ? 'bg-muted-pressed' : 'bg-muted')}
          iconProps={{ color: IconColor.IconDefault }}
          onPressIn={() => setMinusPressed(true)}
          onPressOut={() => setMinusPressed(false)}
          onPress={onDecrease}
          isDisabled={parseFloat(value) <= minAmount}
          testID="input-stepper-minus-button"
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
              testID="input-stepper-input"
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
          isFloating
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
