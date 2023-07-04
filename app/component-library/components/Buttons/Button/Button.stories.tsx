/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import ButtonLinkStory, {
  getButtonLinkStoryProps,
} from './variants/ButtonLink/ButtonLink.stories';
import ButtonPrimaryStory, {
  getButtonPrimaryStoryProps,
} from './variants/ButtonPrimary/ButtonPrimary.stories';
import ButtonSecondaryStory, {
  getButtonSecondaryStoryProps,
} from './variants/ButtonSecondary/ButtonSecondary.stories';

// Internal dependencies.
import { ButtonVariants, ButtonProps } from './Button.types';
import Button from './Button';

export const getButtonStoryProps = (): ButtonProps => {
  let buttonProps: ButtonProps;

  const buttonVariantsSelector = select(
    'Button Variant',
    ButtonVariants,
    ButtonVariants.Primary,
    storybookPropsGroupID,
  );

  switch (buttonVariantsSelector) {
    case ButtonVariants.Link:
      buttonProps = {
        variant: ButtonVariants.Link,
        ...getButtonLinkStoryProps(),
      };
      break;
    case ButtonVariants.Primary:
      buttonProps = {
        variant: ButtonVariants.Primary,
        ...getButtonPrimaryStoryProps(),
      };
      break;
    case ButtonVariants.Secondary:
      buttonProps = {
        variant: ButtonVariants.Secondary,
        ...getButtonSecondaryStoryProps(),
      };
      break;
  }

  return buttonProps;
};
const ButtonStory = () => <Button {...getButtonStoryProps()} />;

storiesOf('Component Library / Buttons', module)
  .add('Button', ButtonStory)
  .add('Variants / ButtonLink', ButtonLinkStory)
  .add('Variants / ButtonPrimary', ButtonPrimaryStory)
  .add('Variants / ButtonSecondary', ButtonSecondaryStory);

export default ButtonStory;
