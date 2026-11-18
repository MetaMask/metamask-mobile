import React from 'react';
import {
  Text as DSText,
  type TextProps as DSTextProps,
} from '@metamask/design-system-react-native';

// The design system only takes twClassName for now; this maps className to it.
interface Props extends DSTextProps {
  className?: string;
}

export function Text({ className, ...rest }: Props) {
  return <DSText {...rest} twClassName={className} />;
}
