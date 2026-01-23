import React from 'react';
import { View } from 'react-native';
import { defaultSlippageButtonGroupStyles as styles } from './styles';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

interface DefaultSlippageOption {
  id: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
}

interface Props {
  options: DefaultSlippageOption[];
}

export const DefaultSlippageButtonGroup = ({ options }: Props) => (
  <View style={styles.container}>
    {options.map((option) => (
      <View key={option.label}>
        <Button
          variant={
            option.selected ? ButtonVariant.Primary : ButtonVariant.Secondary
          }
          size={ButtonSize.Lg}
          onPress={option.onPress}
        >
          {option.label}
        </Button>
      </View>
    ))}
  </View>
);
