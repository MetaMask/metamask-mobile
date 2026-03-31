import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

const Button = ({ children, onPress, disabled, style, ...props }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} {...props}>
    {typeof children === 'string' ? (
      <Text style={style}>{children}</Text>
    ) : (
      children
    )}
  </TouchableOpacity>
);

export default Button;
