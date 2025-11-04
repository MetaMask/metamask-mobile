import React from 'react';
import { Pressable } from 'react-native';
import {
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { ButtonFilterProps } from './ButtonFilter.types';

const ButtonFilter = ({
  label,
  isActive = false,
  labelProps,
  accessibilityLabel,
  style,
  ...props
}: ButtonFilterProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={(state) => [
        tw.style(
          'h-10 px-4 rounded-xl items-center justify-center',
          isActive ? 'bg-icon-default' : 'bg-background-muted',
          state.pressed && 'opacity-70',
        ),
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName={isActive ? 'text-icon-inverse' : 'text-default'}
        {...labelProps}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export default ButtonFilter;
