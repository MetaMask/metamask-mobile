// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import { IconName } from '../../Icons/Icon';

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
  const iconNameSelector = select(
    'name',
    IconName,
    IconName.LockFilled,
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    name: iconNameSelector,
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
