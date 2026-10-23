import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

interface LaminarMockProps {
  text: string | number;
  style?: StyleProp<TextStyle>;
}

export const Laminar = ({ text, style }: LaminarMockProps) => (
  <Text style={style}>{String(text)}</Text>
);

Laminar.displayName = 'LaminarMock';
