import React from 'react';
import { View } from 'react-native';
import { quickPickButtonsStyles as styles } from './styles';
import {
  Button,
  ButtonVariant,
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { QuickPickButtonOption } from './types';

interface Props {
  options: QuickPickButtonOption[];
  show?: boolean;
}

export const QuickPickButtons = ({ options, show }: Props) => {
  if (!show) {
    return null;
  }

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Button
          key={option.label}
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Lg}
          onPress={option.onPress}
          style={styles.button}
        >
          {option.label}
        </Button>
      ))}
    </View>
  );
};
