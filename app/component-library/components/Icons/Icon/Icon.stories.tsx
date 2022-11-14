// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { color, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../constants/storybook.constants';

// Internal dependencies.
import Icon from './Icon';
import { IconProps, IconSize, IconName } from './Icon.types';

export const getIconStoryProps = (): IconProps => ({
  size: select('size', IconSize, IconSize.Md, storybookPropsGroupID),
  name: select('name', IconName, IconName.LockFilled, storybookPropsGroupID),
  color: color('color', '', storybookPropsGroupID),
});
const IconStory = () => <Icon {...getIconStoryProps()} />;

storiesOf('Component Library / Icons', module).add('Icon', IconStory);

export default IconStory;
