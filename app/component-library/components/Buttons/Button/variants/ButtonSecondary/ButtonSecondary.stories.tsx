/* eslint-disable no-console */

// Third party dependencies.
import React from 'react';
import { select, text, boolean } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize, ButtonWidthTypes } from '../../Button.types';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryProps } from './ButtonSecondary.types';

export const getButtonSecondaryStoryProps = (): ButtonSecondaryProps => {
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

  const buttonSecondaryStoryProps: ButtonSecondaryProps = {
    size: sizeSelector,
    label: labelSelector,
    isDanger,
    onPress: () => console.log("I'm clicked!"),
    width: widthSelector,
  };
  if (includesIcon) {
    const iconNameSelector = select(
      'IconName',
      IconName,
      IconName.AddSquare,
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
