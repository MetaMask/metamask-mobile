/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { IconNames } from '../../../../Icons/Icon';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import { ButtonIconVariants, ButtonIconProps } from './ButtonIcon.types';

export const getButtonIconStoryProps = (): ButtonIconProps => {
  const IconNamesSelector = select(
    'IconNames',
    IconNames,
    IconNames.Lock,
    storybookPropsGroupID,
  );
  const variantSelector = select(
    'variant',
    ButtonIconVariants,
    ButtonIconVariants.Primary,
    storybookPropsGroupID,
  );
  const disabledSelector = boolean('disabled', false, storybookPropsGroupID);
  return {
    buttonIconVariants: variantSelector,
    IconNames: IconNamesSelector,
    disabled: disabledSelector,
    onPress: () => console.log("I'm clicked!"),
  };
};

const ButtonIconStory = () => <ButtonIcon {...getButtonIconStoryProps()} />;

export default ButtonIconStory;
