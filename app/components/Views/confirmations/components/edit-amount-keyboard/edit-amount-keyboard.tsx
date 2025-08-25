import React, { ReactNode, useCallback } from 'react';
import { View } from 'react-native';

import KeypadComponent, { KeypadChangeData } from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './edit-amount-keyboard.styles';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { Box } from '../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';

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
}: Readonly<EditAmountKeyboardProps>) {
  const { styles } = useStyles(styleSheet, {});

  const handleChange = useCallback(
    (data: KeypadChangeData) => {
      onChange(data.value);
    },
    [onChange],
  );

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
              label={label}
              style={styles.percentageButton}
              onPress={() => onPercentagePress(val)}
              variant={ButtonVariants.Secondary}
            />
          ))}
          {!hideDoneButton && onDonePress && (
            <Button
              label={strings('confirm.edit_amount_done')}
              style={styles.percentageButton}
              onPress={onDonePress}
              variant={ButtonVariants.Secondary}
            />
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
