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
  hidden?: boolean;
}

export const QuickPickButtons = ({ options, hidden }: Props) => {
  if (hidden) {
    return null;
  }

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Button
          key={option.label}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label={option.label}
          onPress={option.onPress}
          style={styles.button}
        />
      ))}
    </View>
  );
};
