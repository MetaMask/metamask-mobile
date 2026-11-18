import React from 'react';
import {
  Button as DSButton,
  type ButtonProps as DSButtonProps,
} from '@metamask/design-system-react-native';

// The design system only takes twClassName for now; this maps className to it.
// ButtonProps is a union, so this has to be a type, not an interface.
type Props = DSButtonProps & {
  className?: string;
};

export function Button({ className, ...rest }: Props) {
  return <DSButton {...rest} twClassName={className} />;
}
