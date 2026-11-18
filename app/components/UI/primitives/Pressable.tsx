import React from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface Props extends Omit<RNPressableProps, 'style'> {
  className?: string;
  /** Extra classes while pressed, e.g. "opacity-70". */
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
