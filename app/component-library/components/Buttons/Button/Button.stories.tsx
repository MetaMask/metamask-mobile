/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import ButtonIconStory, {
  getButtonIconStoryProps,
} from './variants/ButtonIcon/ButtonIcon.stories';
import ButtonLinkStory, {
  getButtonLinkStoryProps,
} from './variants/ButtonLink/ButtonLink.stories';
import ButtonPrimaryStory, {
  getButtonPrimaryStoryProps,
} from './variants/ButtonPrimary/ButtonPrimary.stories';
import ButtonSecondaryStory, {
  getButtonSecondaryStoryProps,
} from './variants/ButtonSecondary/ButtonSecondary.stories';
import ButtonTertiaryStory, {
  getButtonTertiaryStoryProps,
} from './variants/ButtonTertiary/ButtonTertiary.stories';

// Internal dependencies.
import { ButtonVariants, ButtonProps } from './Button.types';
import Button from './Button';

export const getButtonStoryProps = (): ButtonProps => {
  let buttonProps: ButtonProps;

  const buttonVariantsSelector = select(
    'Button Variant',
    ButtonVariants,
    ButtonVariants.Icon,
    storybookPropsGroupID,
  );

  switch (buttonVariantsSelector) {
    case ButtonVariants.Icon:
      buttonProps = {
        variant: ButtonVariants.Icon,
        ...getButtonIconStoryProps(),
      };
      break;
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
    case ButtonVariants.Tertiary:
      buttonProps = {
        variant: ButtonVariants.Tertiary,
        ...getButtonTertiaryStoryProps(),
      };
      break;
  }

  return buttonProps;
};
const ButtonStory = () => <Button {...getButtonStoryProps()} />;

storiesOf('Component Library / Buttons', module)
  .add('Button', ButtonStory)
  .add('Variants / ButtonIcon', ButtonIconStory)
  .add('Variants / ButtonLink', ButtonLinkStory)
  .add('Variants / ButtonPrimary', ButtonPrimaryStory)
  .add('Variants / ButtonSecondary', ButtonSecondaryStory)
  .add('Variants / ButtonTertiary', ButtonTertiaryStory);

export default ButtonStory;
