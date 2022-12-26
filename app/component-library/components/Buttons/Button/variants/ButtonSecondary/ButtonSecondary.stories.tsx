/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { IconName } from '../../../../Icon';
import { ButtonSize } from '../../Button.types';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import {
  ButtonSecondaryVariants,
  ButtonSecondaryProps,
} from './ButtonSecondary.types';

export const getButtonSecondaryStoryProps = (): ButtonSecondaryProps => {
  const sizeSelector = select(
    'size',
    ButtonSize,
    ButtonSize.Md,
    storybookPropsGroupID,
  );
  const labelSelector = text('label', 'Click Me!', storybookPropsGroupID);
  const ButtonSecondaryVariantsSelector = select(
    'ButtonSecondaryVariants',
    ButtonSecondaryVariants,
    ButtonSecondaryVariants.Normal,
    storybookPropsGroupID,
  );
  const includesIcon = boolean('includesIcon', false, storybookPropsGroupID);

  const buttonSecondaryStoryProps: ButtonSecondaryProps = {
    size: sizeSelector,
    label: labelSelector,
    buttonSecondaryVariants: ButtonSecondaryVariantsSelector,
    onPress: () => console.log("I'm clicked!"),
  };
  if (includesIcon) {
    const iconNameSelector = select(
      'iconName',
      IconName,
      IconName.AddSquareFilled,
      storybookPropsGroupID,
    );
    buttonSecondaryStoryProps.iconName = iconNameSelector;
  }
  return buttonSecondaryStoryProps;
};

const ButtonSecondaryStory = () => (
  <ButtonSecondary {...getButtonSecondaryStoryProps()} />
);

export default ButtonSecondaryStory;
