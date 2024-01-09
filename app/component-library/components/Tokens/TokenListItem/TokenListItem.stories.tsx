/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { default as TokenListItemComponent } from './TokenListItem';
import { SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL } from '../../Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';

const TokenListItemMeta = {
  title: 'Component Library / Tokens',
  component: TokenListItemComponent,
  argTypes: {
    primaryAmount: {
      control: { type: 'text' },
    },
    secondaryAmount: {
      control: { type: 'text' },
    },
    tokenSymbol: {
      control: { type: 'text' },
    },
    tokenName: {
      control: { type: 'text' },
    },
    isStake: {
      control: { type: 'boolean' },
    },
  },
};
export default TokenListItemMeta;

export const TokenListItem = {
  args: {
    primaryAmount: '$123.45',
    secondaryAmount: '1.234 ETH',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    isStake: false,
  },
  render: (args: any) => (
    <TokenListItemComponent
      {...args}
      imageSource={SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL}
    />
  ),
};
