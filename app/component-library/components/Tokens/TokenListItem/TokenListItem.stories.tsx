/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { ValueListVariant } from '../../ValueList/ValueList.types';

// Internal dependencies.
import { default as TokenListItemComponent } from './TokenListItem';
import { SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL } from '../../Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';

const TokenListItemMeta = {
  title: 'Component Library / Tokens',
  component: TokenListItemComponent,
  argTypes: {
    variant: {
      options: ValueListVariant,
      control: {
        type: 'select',
      },
    },
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
    variant: ValueListVariant.Display,
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
