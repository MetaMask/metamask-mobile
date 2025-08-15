import React, { useCallback, useState } from 'react';
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
    label: 'Max',
    value: 100,
  },
];

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
  const [hasInput, setHasInput] = useState<boolean>(false);

  const valueString = value.toString();

  const handleChange = useCallback(
    (data: KeypadChangeData) => {
      onChange(data.value);
      setHasInput(true);
    },
    [onChange],
  );

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      onPercentagePress(percentage);
      setHasInput(true);
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
          PERCENTAGE_BUTTONS.map(({ label, value: buttonValue }) => (
            <Button
              key={buttonValue}
              label={label}
              style={styles.percentageButton}
              onPress={() => handlePercentagePress(buttonValue)}
              variant={ButtonVariants.Secondary}
            />
          ))}
        {hasInput && (
          <Button
            label={strings('confirm.edit_amount_done')}
            style={styles.percentageButton}
            onPress={onDonePress}
            variant={ButtonVariants.Primary}
          />
        )}
      </Box>
      <KeypadComponent
        value={valueString}
        onChange={handleChange}
        currency="native"
      />
    </View>
  );
}
