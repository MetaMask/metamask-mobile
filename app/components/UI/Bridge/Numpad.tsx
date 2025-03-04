import React from 'react';
import { StyleSheet } from 'react-native';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import ButtonIcon, { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Box } from '../../UI/Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../../UI/Box/box.types';

interface NumpadProps {
  onNumberPress: (num: string) => void;
  onBackspacePress: () => void;
  onDecimalPress: () => void;
}

const createStyles = () => StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    row: {
      width: '100%',
    },
    buttonContainer: {
      flex: 1,
      paddingHorizontal: 8,
    },
    button: {
      width: '100%',
      borderWidth: 0,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 24,
      lineHeight: 32,
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

  return (
    <Box style={styles.container} gap={24}>
      {NUMPAD_LAYOUT.map((row) => (
        <Box
          key={row.join('-')}
          style={styles.row}
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
          alignItems={AlignItems.center}
        >
          {row.map((key) => {
            let button: React.ReactNode;

            if (key === 'backspace') {
              button = (
                <ButtonIcon
                  iconName={IconName.Delete}
                  onPress={onBackspacePress}
                  style={styles.button}
                  size={ButtonIconSizes.Lg}
                />
              );
            } else if (key === '.') {
              button = (
                <Button
                  variant={ButtonVariants.Secondary}
                  label={<Text variant={TextVariant.BodyMD} style={styles.buttonText}>{key}</Text>}
                  onPress={onDecimalPress}
                  style={styles.button}
                />
              );
            } else {
              button = (
                <Button
                  variant={ButtonVariants.Secondary}
                  label={<Text variant={TextVariant.BodyMD} style={styles.buttonText}>{key}</Text>}
                  onPress={() => onNumberPress(key)}
                  style={styles.button}
                />
              );
            }

            return (
              <Box key={key} style={styles.buttonContainer}>
                {button}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};
