/* eslint-disable react/prop-types */

/**
 * @deprecated Please update your code to use `Button` from `@metamask/design-system-react-native`
 */

import React from 'react';

// External dependencies.
import ButtonLink from './variants/ButtonLink';
import ButtonPrimary from './variants/ButtonPrimary';
import ButtonSecondary from './variants/ButtonSecondary';

// Internal dependencies.
import { ButtonProps, ButtonVariants } from './Button.types';

const Button = (buttonProps: ButtonProps) => {
  const { variant, ...restProps } = buttonProps;

  switch (variant) {
    case ButtonVariants.Link:
      return <ButtonLink {...restProps} />;
    case ButtonVariants.Primary:
      return <ButtonPrimary {...restProps} />;
    case ButtonVariants.Secondary:
      return <ButtonSecondary {...restProps} />;
    default:
      throw new Error('Invalid Button Variant');
  }
};

export default Button;
