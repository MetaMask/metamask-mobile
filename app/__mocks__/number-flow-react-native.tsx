import React from 'react';
import { Text } from 'react-native';

interface NumberFlowMockProps {
  value: number;
  format?: Intl.NumberFormatOptions;
  locales?: Intl.LocalesArgument;
  suffix?: string;
  prefix?: string;
  style?: object;
}

export const NumberFlow = ({
  value,
  format,
  locales = 'en-US',
  suffix = '',
  prefix = '',
  style,
}: NumberFlowMockProps) => (
  <Text style={style}>
    {`${prefix}${new Intl.NumberFormat(locales, format).format(value)}${suffix}`}
  </Text>
);

NumberFlow.displayName = 'NumberFlowMock';
