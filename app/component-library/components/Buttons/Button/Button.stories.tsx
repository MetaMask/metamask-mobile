/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_BUTTONLINK_PROPS } from './variants/ButtonLink/ButtonLink.constants';
import { SAMPLE_BUTTONPRIMARY_PROPS } from './variants/ButtonPrimary/ButtonPrimary.constants';
import { SAMPLE_BUTTONSECONDARY_PROPS } from './variants/ButtonSecondary/ButtonSecondary.constants';

// Internal dependencies.
import { ButtonVariants } from './Button.types';
import { default as ButtonComponent } from './Button';

const ButtonMeta = {
  title: 'Component Library / Buttons',
  component: ButtonComponent,
  argTypes: {
    variant: {
      options: ButtonVariants,
      control: {
        type: 'select',
      },
      defaultValue: ButtonVariants.Primary,
    },
  },
};
export default ButtonMeta;

export const Button = {
  render: (args: { variant: ButtonVariants }) => {
    switch (args.variant) {
      case ButtonVariants.Link:
        return (
          <ButtonComponent
            variant={ButtonVariants.Link}
            {...SAMPLE_BUTTONLINK_PROPS}
          />
        );
      case ButtonVariants.Primary:
        return (
          <ButtonComponent
            variant={ButtonVariants.Primary}
            {...SAMPLE_BUTTONPRIMARY_PROPS}
          />
        );
      case ButtonVariants.Secondary:
        return (
          <ButtonComponent
            variant={ButtonVariants.Secondary}
            {...SAMPLE_BUTTONSECONDARY_PROPS}
          />
        );
      default:
        throw new Error('Invalid Button Variant');
    }
  },
};
