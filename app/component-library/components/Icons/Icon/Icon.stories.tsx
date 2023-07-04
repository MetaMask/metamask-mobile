// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import Icon from './Icon';
import { IconSize, IconName, IconProps, IconColor } from './Icon.types';
import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE } from './Icon.constants';

export const getIconStoryProps = (): IconProps => {
  const nameSelector = select(
    'name',
    IconName,
    IconName.Lock,
    storybookPropsGroupID,
  );
  const sizeSelector = select(
    'size',
    IconSize,
    DEFAULT_ICON_SIZE,
    storybookPropsGroupID,
  );
  const colorSelector = select(
    'color',
    IconColor,
    DEFAULT_ICON_COLOR,
    storybookPropsGroupID,
  );

  return {
    name: nameSelector,
    size: sizeSelector,
    color: colorSelector,
  };
};

const IconStory = () => <Icon {...getIconStoryProps()} />;

storiesOf('Component Library / Icons', module).add('Icon', IconStory);

export default IconStory;
