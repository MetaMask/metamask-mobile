/* eslint-disable react/prop-types */

import React from 'react';

// External dependencies.
import ButtonLink from './variants/ButtonLink';
import ButtonPrimary from './variants/ButtonPrimary';
import ButtonSecondary from './variants/ButtonSecondary';

// Internal dependencies.
import { ButtonProps, ButtonVariants } from './Button.types';

/**
 * @deprecated Please update your code to use `Button` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Button/README.md}
 */
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
