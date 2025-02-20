import React from 'react';
import { render } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';
import AmountPill from './AmountPill';
import {
  AssetIdentifier,
  AssetType,
  NativeAssetIdentifier,
  TokenAssetIdentifier,
} from '../types';

const TOKEN_ID_MOCK = '0xabc';
const CHAIN_ID_MOCK = '0x123';

const ERC20_ASSET_MOCK: TokenAssetIdentifier = {
  type: AssetType.ERC20,
  address: '0x456',
  chainId: CHAIN_ID_MOCK,
};
const ERC721_ASSET_MOCK: TokenAssetIdentifier = {
  type: AssetType.ERC721,
  address: '0x123',
  tokenId: TOKEN_ID_MOCK,
  chainId: CHAIN_ID_MOCK,
};
const ERC1155_ASSET_MOCK: TokenAssetIdentifier = {
  type: AssetType.ERC1155,
  address: '0x789',
  tokenId: TOKEN_ID_MOCK,
  chainId: CHAIN_ID_MOCK,
};
const NATIVE_ASSET_MOCK: NativeAssetIdentifier = {
  type: AssetType.Native,
  chainId: CHAIN_ID_MOCK,
};

const renderAndExpect = (
  asset: AssetIdentifier,
  amount: BigNumber,
  expected: { text: string },
): void => {
  const { getByText } = render(<AmountPill asset={asset} amount={amount} />);
  expect(getByText(expected.text)).toBeTruthy();
};

describe('AmountPill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const nativeAndErc20Cases = [
    {
      amount: new BigNumber(-123.1234567),
      expected: {
        text: '- 123.1',
      },
    },
    {
      amount: new BigNumber(789.412),
      expected: {
        text: '+ 789.4',
      },
    },
    {
      amount: new BigNumber(-0.000000001),
      expected: {
        text: '- < 0.000001',
      },
    },
    {
      amount: new BigNumber(0.000000001),
      expected: {
        text: '+ < 0.000001',
      },
    },
    {
      amount: new BigNumber(-0),
      expected: {
        text: '- 0',
      },
    },
    {
      amount: new BigNumber(0),
      expected: {
        text: '+ 0',
      },
    },
  ];

  describe('Native', () => {
    it.each(nativeAndErc20Cases)(
      'renders the correct sign and amount for $amount',
      ({ amount, expected }) => {
        renderAndExpect(NATIVE_ASSET_MOCK, amount, expected);
      },
    );
  });

  describe('ERC20', () => {
    it.each(nativeAndErc20Cases)(
      'renders the correct sign and amount for $amount',
      ({ amount, expected }) => {
        renderAndExpect(ERC20_ASSET_MOCK, amount, expected);
      },
    );
  });

  describe('ERC721', () => {
    const cases = [
      {
        amount: new BigNumber(-1),
        expected: {
          text: '- #2748',
        },
      },
      {
        amount: new BigNumber(1),
        expected: {
          text: '+ #2748',
        },
      },
    ];

    it.each(cases)(
      'renders the token ID with just a plus or minus for $expected.text',
      ({ amount, expected }) => {
        renderAndExpect(ERC721_ASSET_MOCK, amount, expected);
      },
    );
  });

  describe('ERC1155', () => {
    const cases = [
      {
        amount: new BigNumber(-3),
        expected: {
          text: '- 3 #2748',
        },
      },
      {
        amount: new BigNumber(8),
        expected: {
          text: '+ 8 #2748',
        },
      },
      {
        amount: new BigNumber(-12),
        expected: {
          text: '- 12 #2748',
        },
      },
    ];

    it.each(cases)(
      'renders the correct sign, amount, and token ID for $expected.text',
      ({ amount, expected }) => {
        renderAndExpect(ERC1155_ASSET_MOCK, amount, expected);
      },
    );
  });
});
