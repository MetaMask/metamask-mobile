/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { AvatarSize } from '../../Avatars/Avatar';

// Internal dependencies.
import { default as TokenIconComponent } from './TokenIcon';
import { SAMPLE_AVATARTOKEN_PROPS } from '../../Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';

const TokenIconMeta = {
  title: 'Component Library / Tokens',
  component: TokenIconComponent,
  argTypes: {
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
    },
    name: {
      control: { type: 'text' },
    },
  },
};
export default TokenIconMeta;

export const TokenIcon = {
  args: {
    size: SAMPLE_AVATARTOKEN_PROPS.size,
    name: SAMPLE_AVATARTOKEN_PROPS.name,
  },
  render: (args: any) => (
    <TokenIconComponent
      {...args}
      isIpfsGatewayCheckBypassed
      imageSource={SAMPLE_AVATARTOKEN_PROPS.imageSource}
    />
  ),
};
