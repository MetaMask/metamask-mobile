// Third party dependencies
import React from 'react';
import { Meta, Story } from '@storybook/react-native';

// Internal Dependencies
import AvatarGroup from './AvatarGroup';
import { AvatarGroupProps } from './AvatarGroup.types';
import { AvatarSize } from '../Avatar/Avatar.types';
import { SAMPLE_AVATARGROUP_PROPS } from './AvatarGroup.constants';

export default {
  title: 'Component Library / Avatars / AvatarGroup',
  component: AvatarGroup,
  argTypes: {
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
    },
    maxStackedAvatars: {
      control: {
        type: 'number',
      },
    },
  },
} as Meta;

const Template: Story<AvatarGroupProps> = (args) => (
  <AvatarGroup
    {...args}
    avatarPropsList={SAMPLE_AVATARGROUP_PROPS.avatarPropsList}
  />
);

export const Default = Template.bind({});
Default.args = {
  size: SAMPLE_AVATARGROUP_PROPS.size,
  maxStackedAvatars: SAMPLE_AVATARGROUP_PROPS.maxStackedAvatars,
};
