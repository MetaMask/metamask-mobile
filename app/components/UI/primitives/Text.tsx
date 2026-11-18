import React from 'react';
import {
  Text as DSText,
  type TextProps,
} from '@metamask/design-system-react-native';

interface Props extends TextProps {
  className?: string;
}

export function Text({ className, ...rest }: Props) {
  return <DSText {...rest} twClassName={className} />;
}
