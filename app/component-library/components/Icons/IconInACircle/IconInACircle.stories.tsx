// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { color, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import { IconName } from '../Icon/Icon.types';

// Internal dependencies.
import IconInACircle from './IconInACircle';
import { IconInACircleProps, IconInACircleSizes } from './IconInACircle.types';

export const getIconInACircleStoryProps = (): IconInACircleProps => {
  const sizeSelector = select(
    'size',
    IconInACircleSizes,
    IconInACircleSizes.Md,
    storybookPropsGroupID,
  );
  const nameSelector = select(
    'iconName',
    IconName,
    IconName.LockFilled,
    storybookPropsGroupID,
  );
  const iconColorPicker = color('iconColor', '', storybookPropsGroupID);
  const backgroundColorPicker = color(
    'backgroundColor',
    '',
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    iconProps: {
      name: nameSelector,
      color: iconColorPicker,
    },
    backgroundColor: backgroundColorPicker,
  };
};
const IconInACircleStory = () => (
  <IconInACircle {...getIconInACircleStoryProps()} />
);

storiesOf('Component Library / Icons', module).add(
  'IconInACircle',
  IconInACircleStory,
);

export default IconInACircleStory;
