import React from 'react';
import { StyleSheet } from 'react-native';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import ButtonIcon, { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../../UI/Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../../UI/Box/box.types';

interface NumpadProps {
  onNumberPress: (num: string) => void;
  onBackspacePress: () => void;
  onDecimalPress: () => void;
}

const createStyles = ({ theme }: { theme: Theme }) => StyleSheet.create({
    container: {
      marginVertical: 16,
      paddingHorizontal: 16,
    },
    row: {
      marginBottom: 24,
      width: '100%',
    },
    buttonContainer: {
      flex: 1,
      paddingHorizontal: 8,
    },
    button: {
      width: '100%',
      borderWidth: 0,
      backgroundColor: theme.colors.background.default,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 24,
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
    const buttonContent = key === 'backspace' ? (
      <ButtonIcon
        key={key}
        iconName={IconName.Delete}
        onPress={onBackspacePress}
        style={styles.button}
        size={ButtonIconSizes.Lg}
      />
    ) : (
      <Button
        key={key}
        variant={ButtonVariants.Secondary}
        label={<Text variant={TextVariant.BodyMD} style={styles.buttonText}>{key}</Text>}
        onPress={key === '.' ? onDecimalPress : () => onNumberPress(key)}
        style={styles.button}
      />
    );

    return (
      <Box key={key} style={styles.buttonContainer}>
        {buttonContent}
      </Box>
    );
  };

  return (
    <Box style={styles.container}>
      {NUMPAD_LAYOUT.map((row) => (
        <Box
          key={row.join('-')}
          style={styles.row}
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
          alignItems={AlignItems.center}
        >
          {row.map((key) => renderButton(key))}
        </Box>
      ))}
    </Box>
  );
};
