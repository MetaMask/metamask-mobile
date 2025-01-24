/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { default as AvatarTokenComponent } from './AvatarToken';
import { SAMPLE_AVATARTOKEN_PROPS } from './AvatarToken.constants';

const AvatarTokenMeta = {
  title: 'Component Library / Avatars',
  component: AvatarTokenComponent,
  argTypes: {
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_AVATARTOKEN_PROPS.size,
    },
    name: {
      control: { type: 'text' },
      defaultValue: SAMPLE_AVATARTOKEN_PROPS.name,
    },
  },
};
export default AvatarTokenMeta;

export const AvatarToken = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: any) => (
    <AvatarTokenComponent
      {...args}
      isIpfsGatewayCheckBypassed
      imageSource={SAMPLE_AVATARTOKEN_PROPS.imageSource}
    />
  ),
};
