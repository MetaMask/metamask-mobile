import React, { memo, useCallback } from 'react';
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
import Text from '../../../../../component-library/components/Texts/Text';
import { PERPS_CURRENCY } from '../../constants/perps';

const PERCENTAGE_BUTTONS = [
  {
    label: '10%',
    value: 10,
  },
  {
    label: '25%',
    value: 25,
  },
  {
    label: '50%',
    value: 50,
  },
  {
    label: '90%',
    value: 90,
  },
];

export interface DepositKeyboardProps {
  alertMessage?: string;
  hasInput: boolean;
  onChange: (value: string) => void;
  onPercentagePress: (percentage: number) => void;
  onDonePress: () => void;
  value: string;
}

export const DepositKeyboard = memo(
  ({
    alertMessage,
    hasInput,
    onChange,
    onDonePress,
    onPercentagePress,
    value,
  }: DepositKeyboardProps) => {
    const currentCurrency = PERPS_CURRENCY;
    const { styles } = useStyles(styleSheet, {});

    const valueString = value.toString();

    const handleChange = useCallback(
      (data: KeypadChangeData) => {
        onChange(data.value);
      },
      [onChange],
    );

    const handlePercentagePress = useCallback(
      (percentage: number) => {
        onPercentagePress(percentage);
      },
      [onPercentagePress],
    );

    return (
      <View>
        <Box
          testID="deposit-keyboard"
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
          gap={10}
        >
          {!hasInput &&
            !alertMessage &&
            PERCENTAGE_BUTTONS.map(({ label, value: buttonValue }) => (
              <Button
                key={buttonValue}
                label={label}
                style={styles.percentageButton}
                onPress={() => handlePercentagePress(buttonValue)}
                variant={ButtonVariants.Secondary}
              />
            ))}
          {hasInput && !alertMessage && (
            <Button
              testID="deposit-keyboard-done-button"
              label={strings('confirm.deposit_edit_amount_done')}
              style={styles.percentageButton}
              onPress={onDonePress}
              variant={ButtonVariants.Primary}
            />
          )}
          {alertMessage && (
            <Box style={styles.alertContainer}>
              <Text style={styles.alertText}>{alertMessage}</Text>
            </Box>
          )}
        </Box>
        <KeypadComponent
          value={valueString}
          onChange={handleChange}
          currency={currentCurrency}
          decimals={2}
        />
      </View>
    );
  },
);
