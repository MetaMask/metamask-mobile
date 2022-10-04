/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import { ButtonIconVariant, ButtonIconProps } from './ButtonIcon.types';

export const getButtonIconStoryProps = (): ButtonIconProps => {
  const iconNameSelector = select(
    'iconName',
    IconName,
    IconName.LockFilled,
    storybookPropsGroupID,
  );
  const variantSelector = select(
    'variant',
    ButtonIconVariant,
    ButtonIconVariant.Primary,
    storybookPropsGroupID,
  );
  const disabledSelector = boolean('disabled', false, storybookPropsGroupID);
  return {
    buttonIconVariant: variantSelector,
    iconName: iconNameSelector,
    disabled: disabledSelector,
    onPress: () => console.log("I'm clicked!"),
  };
};

const ButtonIconStory = () => <ButtonIcon {...getButtonIconStoryProps()} />;

export default ButtonIconStory;
