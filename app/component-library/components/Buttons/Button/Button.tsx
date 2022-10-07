/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import ButtonIcon from './variants/ButtonIcon';
import ButtonLink from './variants/ButtonLink';
import ButtonPrimary from './variants/ButtonPrimary';
import ButtonSecondary from './variants/ButtonSecondary';
import ButtonTertiary from './variants/ButtonTertiary';

// Internal dependencies.
import { ButtonProps, ButtonVariants } from './Button.types';

const Button = (buttonProps: ButtonProps) => {
  switch (buttonProps.variant) {
    case ButtonVariants.Icon:
      return <ButtonIcon {...buttonProps} />;
    case ButtonVariants.Link:
      return <ButtonLink {...buttonProps} />;
    case ButtonVariants.Primary:
      return <ButtonPrimary {...buttonProps} />;
    case ButtonVariants.Secondary:
      return <ButtonSecondary {...buttonProps} />;
    case ButtonVariants.Tertiary:
      return <ButtonTertiary {...buttonProps} />;
    default:
      throw new Error('Invalid Button Variant');
  }
};

export default Button;
