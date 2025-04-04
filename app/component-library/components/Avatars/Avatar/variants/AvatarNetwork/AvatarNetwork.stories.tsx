/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { default as AvatarNetworkComponent } from './AvatarNetwork';
import { SAMPLE_AVATARNETWORK_PROPS } from './AvatarNetwork.constants';

const AvatarNetworkMeta = {
  title: 'Component Library / Avatars',
  component: AvatarNetworkComponent,
  argTypes: {
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARNETWORK_PROPS.size,
    },
    name: {
      control: { type: 'text' },
      defaultValue: SAMPLE_AVATARNETWORK_PROPS.name,
    },
  },
};
export default AvatarNetworkMeta;

export const AvatarNetwork = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <AvatarNetworkComponent
      {...args}
      imageSource={SAMPLE_AVATARNETWORK_PROPS.imageSource}
    />
  ),
};
