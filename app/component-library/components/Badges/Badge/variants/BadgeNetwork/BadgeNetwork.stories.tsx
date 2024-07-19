/* eslint-disable react-native/no-inline-styles */
// Third party dependencies
import React from 'react';
import { View } from 'react-native';
import { Meta, Story } from '@storybook/react-native';

// Internal dependencies.
import BadgeNetwork from './BadgeNetwork';
import { BadgeNetworkProps } from './BadgeNetwork.types';
import { SAMPLE_BADGENETWORK_PROPS } from './BadgeNetwork.constants';

export default {
  title: 'Component Library / Badges / BadgeNetwork',
  component: BadgeNetwork,
  argTypes: {
    name: { control: 'text' },
    isScaled: { control: 'boolean' },
  },
} as Meta;

const customRender = (args: BadgeNetworkProps) => (
  <View
    style={{
      height: 50,
      width: 50,
    }}
  >
    <BadgeNetwork
      {...args}
      imageSource={SAMPLE_BADGENETWORK_PROPS.imageSource}
    />
  </View>
);

const Template: Story<BadgeNetworkProps> = (args) => customRender(args);

export const Default = Template.bind({});
Default.args = {
  ...SAMPLE_BADGENETWORK_PROPS,
};

export const Scaled = Template.bind({});
Scaled.args = {
  ...SAMPLE_BADGENETWORK_PROPS,
  isScaled: true,
};

export const NotScaled = Template.bind({});
NotScaled.args = {
  ...SAMPLE_BADGENETWORK_PROPS,
  isScaled: false,
};
