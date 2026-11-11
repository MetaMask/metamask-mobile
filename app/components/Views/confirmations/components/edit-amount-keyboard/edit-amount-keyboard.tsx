import React, { ReactNode, useCallback } from 'react';
import { View } from 'react-native';

import KeypadComponent, {
  KeypadChangeData,
  Keys,
} from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './edit-amount-keyboard.styles';
import { Button, ButtonVariant } from '@metamask/design-system-react-native';
import { Box } from '../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';

const ADDITIONAL_BUTTONS = [
  { value: 10, label: '10%' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
];

export interface EditAmountKeyboardProps {
  onChange: (value: string) => void;
  onPercentagePress: (percentage: number) => void;
  onDonePress?: () => void;
  value: string;
  additionalButtons?: { value: number; label: string }[];
  hideDoneButton?: boolean;
  showAdditionalKeyboard?: boolean;
  additionalRow?: ReactNode;
  enableEmptyValueString?: boolean;
}

export function EditAmountKeyboard({
  onChange,
  onDonePress,
  onPercentagePress,
  value,
  additionalButtons = ADDITIONAL_BUTTONS,
  hideDoneButton = false,
  showAdditionalKeyboard = true,
  additionalRow,
  enableEmptyValueString = false,
}: Readonly<EditAmountKeyboardProps>) {
  const { styles } = useStyles(styleSheet, {});

  const handleChange = useCallback(
    (data: KeypadChangeData) => {
      const { pressedKey, value } = data;
      if (pressedKey === Keys.Back && value === '0' && enableEmptyValueString) {
        onChange('');
        return;
      }
      onChange(value);
    },
    [enableEmptyValueString, onChange],
  );

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      playImpact(ImpactMoment.QuickAmountSelection).catch(() => undefined);
      onPercentagePress(percentage);
    },
    [onPercentagePress],
  );

  const handleDonePress = useCallback(() => {
    playImpact(ImpactMoment.KeypadKey).catch(() => undefined);
    onDonePress?.();
  }, [onDonePress]);

  return (
    <View style={styles.wrapper}>
      {additionalRow}
      {showAdditionalKeyboard && (
        <Box
          testID="edit-amount-keyboard"
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
          gap={10}
          style={styles.additionalButtons}
        >
          {additionalButtons.map(({ value: val, label }) => (
            <Button
              key={`${val}-${label}`}
              testID={`percentage-button-${val}`}
              style={styles.percentageButton}
              onPress={() => handlePercentagePress(val)}
              variant={ButtonVariant.Secondary}
            >
              {label}
            </Button>
          ))}
          {!hideDoneButton && onDonePress && (
            <Button
              style={styles.percentageButton}
              onPress={handleDonePress}
              variant={ButtonVariant.Secondary}
            >
              {strings('confirm.edit_amount_done')}
            </Button>
          )}
        </Box>
      )}
      <KeypadComponent
        value={value}
        onChange={handleChange}
        currency="native"
      />
    </View>
  );
}
