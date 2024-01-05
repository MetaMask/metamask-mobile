/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';
import { SAMPLE_AVATARTOKEN_IMAGESOURCE_LOCAL } from '../../Avatars/Avatar/variants/AvatarToken/AvatarToken.constants';
import { ValueListVariant } from '../../ValueList/ValueList.types';

// Internal dependencies.
import { default as TokenListComponent } from './TokenList';

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

const TokenListMeta = {
  title: 'Component Library / Tokens',
  component: TokenListComponent,
  argTypes: {
    variant: {
      options: ValueListVariant,
      control: {
        type: 'select',
      },
    },
    isSearchable: {
      control: { type: 'boolean' },
    },
  },
};
export default TokenListMeta;

export const TokenList = {
  args: {
    variant: ValueListVariant.Display,
    isSearchable: false,
  },
  render: (args: any) => (
    <TokenListComponent {...args} options={sampleOptions} />
  ),
};
