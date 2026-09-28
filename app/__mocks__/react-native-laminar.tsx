import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

interface LaminarMockProps {
  text: string | number;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

export const Laminar = ({ text, style, testID }: LaminarMockProps) => (
  <Text style={style} testID={testID}>
    {String(text)}
  </Text>
);

Laminar.displayName = 'LaminarMock';
