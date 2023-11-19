/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import { default as BadgeNetworkComponent } from './BadgeNetwork';
import { SAMPLE_BADGENETWORK_PROPS } from './BadgeNetwork.constants';
import { BadgeNetworkProps } from './BadgeNetwork.types';

const BadgeNetworkMeta = {
  title: 'Component Library / Badges',
  component: BadgeNetworkComponent,
  argTypes: {
    name: {
      control: { type: 'text' },
      defaultValue: SAMPLE_BADGENETWORK_PROPS.name,
    },
  },
};
export default BadgeNetworkMeta;

export const BadgeNetwork = {
  render: (args: JSX.IntrinsicAttributes & BadgeNetworkProps) => (
    <View
      style={{
        height: 50,
        width: 50,
      }}
    >
      <BadgeNetworkComponent
        {...args}
        imageSource={SAMPLE_BADGENETWORK_PROPS.imageSource}
      />
    </View>
  ),
};
