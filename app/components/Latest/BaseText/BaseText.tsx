import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';
import styles from './styles';
import { BaseTextVariant } from './types';

interface Props extends TextProps {
  /**
   * Enum to select between Typography variants
   */
  variant?: BaseTextVariant;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<TextStyle>;
  /**
   * Children component of a Text component
   */
  children?: React.ReactNode;
}

const BaseText: React.FC<Props> = ({ variant, style, children, ...props }) => {
  return (
    <Text {...props} style={[styles.base, style]}>
      {children}
    </Text>
  );
};

export default BaseText;
