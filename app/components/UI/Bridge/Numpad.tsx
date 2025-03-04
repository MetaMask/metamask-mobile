import React from 'react';
import { StyleSheet, View } from 'react-native';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';

interface NumpadProps {
  onNumberPress: (num: string) => void;
  onBackspacePress: () => void;
  onDecimalPress: () => void;
}

const createStyles = (_: { theme: Theme }) => StyleSheet.create({
    container: {
      marginVertical: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    button: {
      flex: 1,
      marginHorizontal: 4,
    },
  });

const NUMPAD_LAYOUT = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
];

export const Numpad: React.FC<NumpadProps> = ({
  onNumberPress,
  onBackspacePress,
  onDecimalPress,
}) => {
  const { styles } = useStyles(createStyles, {});

  const renderButton = (key: string) => {
    if (key === 'backspace') {
      return (
        <ButtonIcon
          key={key}
          iconName={IconName.Close}
          onPress={onBackspacePress}
          style={styles.button}
        />
      );
    }

    if (key === '.') {
      return (
        <Button
          key={key}
          variant={ButtonVariants.Secondary}
          label={key}
          onPress={onDecimalPress}
          style={styles.button}
        />
      );
    }

    return (
      <Button
        key={key}
        variant={ButtonVariants.Secondary}
        label={key}
        onPress={() => onNumberPress(key)}
        style={styles.button}
      />
    );
  };

  return (
    <View style={styles.container}>
      {NUMPAD_LAYOUT.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((key) => renderButton(key))}
        </View>
      ))}
    </View>
  );
};
