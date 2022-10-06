/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { IconName } from '../../../../Icon';
import { ButtonSize } from '../../Button.types';

// Internal dependencies.
import ButtonTertiary from './ButtonTertiary';
import {
  ButtonTertiaryVariants,
  ButtonTertiaryProps,
} from './ButtonTertiary.types';

export const getButtonTertiaryStoryProps = (): ButtonTertiaryProps => {
  const sizeSelector = select(
    'size',
    ButtonSize,
    ButtonSize.Md,
    storybookPropsGroupID,
  );
  const labelSelector = text('label', 'Click Me!', storybookPropsGroupID);
  const ButtonTertiaryVariantsSelector = select(
    'ButtonTertiaryVariants',
    ButtonTertiaryVariants,
    ButtonTertiaryVariants.Normal,
    storybookPropsGroupID,
  );
  const includesIcon = boolean('includesIcon', false, storybookPropsGroupID);

  const buttonTertiaryStoryProps: ButtonTertiaryProps = {
    size: sizeSelector,
    label: labelSelector,
    buttonTertiaryVariants: ButtonTertiaryVariantsSelector,
    onPress: () => console.log("I'm clicked!"),
  };
  if (includesIcon) {
    const iconNameSelector = select(
      'iconName',
      IconName,
      IconName.AddSquareFilled,
      storybookPropsGroupID,
    );
    buttonTertiaryStoryProps.iconName = iconNameSelector;
  }
  return buttonTertiaryStoryProps;
};

const ButtonTertiaryStory = () => (
  <ButtonTertiary {...getButtonTertiaryStoryProps()} />
);

export default ButtonTertiaryStory;
