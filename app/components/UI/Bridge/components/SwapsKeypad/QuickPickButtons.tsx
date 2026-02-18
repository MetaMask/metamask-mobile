import React from 'react';
import { View } from 'react-native';
import { quickPickButtonsStyles as styles } from './styles';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
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
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          label={option.label}
          onPress={option.onPress}
          style={styles.button}
        />
      ))}
    </View>
  );
};
