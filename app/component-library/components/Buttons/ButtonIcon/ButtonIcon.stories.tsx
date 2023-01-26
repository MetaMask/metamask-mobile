/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, boolean } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import { IconName } from '../../Icon';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import {
  ButtonIconVariants,
  ButtonIconProps,
  ButtonIconSizes,
} from './ButtonIcon.types';

export const getButtonIconStoryProps = (): ButtonIconProps => {
  const sizeSelector = select(
    'size',
    ButtonIconSizes,
    ButtonIconSizes.Lg,
    storybookPropsGroupID,
  );
  const iconNameSelector = select(
    'iconName',
    IconName,
    IconName.LockFilled,
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
    variant: variantSelector,
    iconName: iconNameSelector,
    disabled: disabledSelector,
    onPress: () => console.log("I'm clicked!"),
    size: sizeSelector,
  };
};

const ButtonIconStory = () => <ButtonIcon {...getButtonIconStoryProps()} />;

storiesOf('Component Library / Buttons', module).add(
  'ButtonIcon',
  ButtonIconStory,
);

export default ButtonIconStory;
