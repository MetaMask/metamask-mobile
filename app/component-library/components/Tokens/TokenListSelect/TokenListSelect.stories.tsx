/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';
import { SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL } from '../../Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';

// Internal dependencies.
import { default as TokenListSelectComponent } from './TokenListSelect';

const TokenListSelectStoryMeta = {
  title: 'Component Library / Tokens',
  component: TokenListSelectComponent,
};

export default TokenListSelectStoryMeta;

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
export const TokenListSelect = {
  render: (args: any) => (
    <TokenListSelectComponent {...args} options={sampleOptions} />
  ),
};
