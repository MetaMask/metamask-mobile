/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { IconName } from '../../../../Icon';
import { ButtonSize } from '../../Button.types';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';
import {
  ButtonPrimaryVariants,
  ButtonPrimaryProps,
} from './ButtonPrimary.types';

export const getButtonPrimaryStoryProps = (): ButtonPrimaryProps => {
  const sizeSelector = select(
    'size',
    ButtonSize,
    ButtonSize.Md,
    storybookPropsGroupID,
  );
  const labelSelector = text('label', 'Click Me!', storybookPropsGroupID);
  const ButtonPrimaryVariantsSelector = select(
    'ButtonPrimaryVariants',
    ButtonPrimaryVariants,
    ButtonPrimaryVariants.Normal,
    storybookPropsGroupID,
  );
  const includesIcon = boolean('includesIcon', false, storybookPropsGroupID);

  const buttonPrimaryStoryProps: ButtonPrimaryProps = {
    size: sizeSelector,
    label: labelSelector,
    buttonPrimaryVariants: ButtonPrimaryVariantsSelector,
    onPress: () => console.log("I'm clicked!"),
  };
  if (includesIcon) {
    const iconNameSelector = select(
      'iconName',
      IconName,
      IconName.AddSquareFilled,
      storybookPropsGroupID,
    );
    buttonPrimaryStoryProps.iconName = iconNameSelector;
  }
  return buttonPrimaryStoryProps;
};

const ButtonPrimaryStory = () => (
  <ButtonPrimary {...getButtonPrimaryStoryProps()} />
);

export default ButtonPrimaryStory;
