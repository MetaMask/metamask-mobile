import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface Props extends Omit<PressableProps, 'style'> {
  className?: string;
  pressedClassName?: string;
}

export function Pressable({ className, pressedClassName, ...rest }: Props) {
  const tw = useTailwind();

  return (
    <RNPressable
      {...rest}
      style={({ pressed }) => tw.style(className, pressed && pressedClassName)}
    />
  );
}
