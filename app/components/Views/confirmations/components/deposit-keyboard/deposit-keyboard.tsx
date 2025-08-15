import React, { useCallback } from 'react';
import KeypadComponent, { KeypadChangeData } from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './deposit-keyboard.styles';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { Box } from '../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import { View } from 'react-native';

const PERCENTAGE_BUTTONS = [10, 25, 50];

export interface DepositKeyboardProps {
  onChange: (value: string) => void;
  onPercentagePress: (percentage: number) => void;
  onDonePress: () => void;
  value: string;
}

export function DepositKeyboard({
  onChange,
  onDonePress,
  onPercentagePress,
  value,
}: DepositKeyboardProps) {
  const { styles } = useStyles(styleSheet, {});

  const valueString = value.toString();

  const handleChange = useCallback(
    (data: KeypadChangeData) => {
      onChange(data.value);
    },
    [onChange],
  );

  return (
    <View>
      <Box
        testID="deposit-keyboard"
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        gap={10}
      >
        {PERCENTAGE_BUTTONS.map((percentage) => (
          <Button
            key={percentage}
            label={`${percentage}%`}
            style={styles.percentageButton}
            onPress={() => onPercentagePress(percentage)}
            variant={ButtonVariants.Secondary}
          />
        ))}
        <Button
          label={strings('confirm.edit_amount_done')}
          style={styles.percentageButton}
          onPress={onDonePress}
          variant={ButtonVariants.Secondary}
        />
      </Box>
      <KeypadComponent
        value={valueString}
        onChange={handleChange}
        currency="native"
      />
    </View>
  );
}
