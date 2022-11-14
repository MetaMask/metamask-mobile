// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { color, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import { IconName } from '../Icon/Icon.types';

// Internal dependencies.
import IconContainer from './IconContainer';
import { IconContainerProps, IconContainerSizes } from './IconContainer.types';

export const getIconContainerStoryProps = (): IconContainerProps => {
  const sizeSelector = select(
    'size',
    IconContainerSizes,
    IconContainerSizes.Md,
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
const IconContainerStory = () => (
  <IconContainer {...getIconContainerStoryProps()} />
);

storiesOf('Component Library / Icons', module).add(
  'IconContainer',
  IconContainerStory,
);

export default IconContainerStory;
