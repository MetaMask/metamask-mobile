/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';
import { SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL } from '../../Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';

// Internal dependencies.
import { default as TokenSelectComponent } from './TokenSelect';

const TokenSelectStoryMeta = {
  title: 'Component Library / Tokens',
  component: TokenSelectComponent,
  argTypes: {
    placeholder: {
      control: { type: 'text' },
    },
    title: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
    isSearchable: {
      control: { type: 'boolean' },
    },
  },
};

export default TokenSelectStoryMeta;

const sampleOptions: TokenListItemProps[] = [
  {
    primaryAmount: '$123.45',
    secondaryAmount: '1.234 ETH',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    isStake: false,
    tokenImageSource: SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL,
  },
  {
    primaryAmount: '$123.45',
    secondaryAmount: '1.234 ETH',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    isStake: false,
    tokenImageSource: SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL,
  },
  {
    primaryAmount: '$123.45',
    secondaryAmount: '1.234 ETH',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    isStake: false,
    tokenImageSource: SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL,
  },
  {
    primaryAmount: '$123.45',
    secondaryAmount: '1.234 ETH',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    isStake: false,
    tokenImageSource: SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL,
  },
];
export const TokenSelect = {
  args: {
    title: 'test Title',
    description: 'test Description',
    placeholder: 'test',
    isSearchable: false,
  },
  render: (args: any) => (
    <TokenSelectComponent {...args} options={sampleOptions} />
  ),
};
