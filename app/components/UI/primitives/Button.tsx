import React from 'react';
import {
  Button as DSButton,
  type ButtonProps,
} from '@metamask/design-system-react-native';

type Props = ButtonProps & {
  className?: string;
};

export function Button({ className, ...rest }: Props) {
  return <DSButton {...rest} twClassName={className} />;
}
