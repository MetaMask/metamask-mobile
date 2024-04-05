/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import ButtonLink from './variants/ButtonLink';
import ButtonPrimary from './variants/ButtonPrimary';
import ButtonSecondary from './variants/ButtonSecondary';

// Internal dependencies.
import { ButtonProps, ButtonVariants } from './Button.types';

const Button = (buttonProps: ButtonProps) => {
  switch (buttonProps.variant) {
    case ButtonVariants.Link:
      return <ButtonLink {...buttonProps} />;
    case ButtonVariants.Primary:
      return <ButtonPrimary {...buttonProps} />;
    case ButtonVariants.Secondary:
      return <ButtonSecondary {...buttonProps} />;
    default:
      throw new Error('Invalid Button Variant');
  }
};

export default Button;
