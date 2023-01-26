/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { IconName } from '../../../../Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';
import { ButtonPrimaryProps } from './ButtonPrimary.types';

export const getButtonPrimaryStoryProps = (): ButtonPrimaryProps => {
  const sizeSelector = select(
    'size',
    ButtonSize,
    ButtonSize.Md,
    storybookPropsGroupID,
  );
  const widthSelector = select(
    'width',
    ButtonWidthTypes,
    ButtonWidthTypes.Auto,
    storybookPropsGroupID,
  );
  const labelSelector = text('label', 'Click Me!', storybookPropsGroupID);
  const isDanger = boolean('isDanger', false, storybookPropsGroupID);
  const includesIcon = boolean('includesIcon', false, storybookPropsGroupID);

  const buttonPrimaryStoryProps: ButtonPrimaryProps = {
    size: sizeSelector,
    label: labelSelector,
    isDanger,
    onPress: () => console.log("I'm clicked!"),
    width: widthSelector,
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
