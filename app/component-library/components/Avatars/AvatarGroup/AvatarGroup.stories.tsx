// Third party dependencies
import React from 'react';
import { Meta, Story } from '@storybook/react-native';

// Internal Dependencies
import AvatarGroup from './AvatarGroup';
import { AvatarGroupProps } from './AvatarGroup.types';
import { AvatarSize } from '../Avatar/Avatar.types';
import { SAMPLE_AVATARGROUP_PROPS } from './AvatarGroup.constants';

const defaultArgTypes = {
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
  includesBorder: {
    control: {
      type: 'boolean',
    },
  },
};
export default {
  title: 'Component Library / Avatars / AvatarGroup',
  component: AvatarGroup,
} as Meta;

const Template: Story<AvatarGroupProps> = (
  args: React.JSX.IntrinsicAttributes & AvatarGroupProps,
) => (
  <AvatarGroup
    {...args}
    avatarPropsList={SAMPLE_AVATARGROUP_PROPS.avatarPropsList}
  />
);

export const Default = Template.bind({});
Default.argTypes = defaultArgTypes;
Default.args = {
  size: SAMPLE_AVATARGROUP_PROPS.size,
  maxStackedAvatars: SAMPLE_AVATARGROUP_PROPS.maxStackedAvatars,
  includesBorder: SAMPLE_AVATARGROUP_PROPS.includesBorder,
};

export const CustomSpaceBetweenAvatars = Template.bind({});
CustomSpaceBetweenAvatars.argTypes = {
  ...defaultArgTypes,
  spaceBetweenAvatars: {
    control: {
      type: 'number',
    },
  },
};
CustomSpaceBetweenAvatars.args = {
  size: SAMPLE_AVATARGROUP_PROPS.size,
  maxStackedAvatars: SAMPLE_AVATARGROUP_PROPS.maxStackedAvatars,
  includesBorder: SAMPLE_AVATARGROUP_PROPS.includesBorder,
  spaceBetweenAvatars: SAMPLE_AVATARGROUP_PROPS.spaceBetweenAvatars,
};
