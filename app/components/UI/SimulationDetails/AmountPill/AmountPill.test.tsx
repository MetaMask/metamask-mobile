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
  props: {
    asset: AssetIdentifier;
    amount: BigNumber;
    isApproval?: boolean;
    isAllApproval?: boolean;
    isUnlimitedApproval?: boolean;
  },
  expected: { text: string },
): void => {
  const { getByText } = render(<AmountPill {...props} />);
  expect(getByText(expected.text)).toBeTruthy();
};

describe('AmountPill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const nativeAndErc20Cases = [
    {
      props: { amount: new BigNumber(-123.1234567) },
      expected: {
        text: '- 123.1',
      },
    },
    {
      props: { amount: new BigNumber(789.412) },
      expected: {
        text: '+ 789.4',
      },
    },
    {
      props: { amount: new BigNumber(-0.000000001) },
      expected: {
        text: '- < 0.000001',
      },
    },
    {
      props: { amount: new BigNumber(0.000000001) },
      expected: {
        text: '+ < 0.000001',
      },
    },
    {
      props: { amount: new BigNumber(-0) },
      expected: {
        text: '- 0',
      },
    },
    {
      props: { amount: new BigNumber(0) },
      expected: {
        text: '+ 0',
      },
    },
    {
      props: { amount: new BigNumber(100), isApproval: true },
      expected: {
        text: '100',
      },
    },
    {
      props: {
        amount: new BigNumber(100),
        isApproval: true,
        isUnlimitedApproval: true,
      },
      expected: {
        text: 'Unlimited',
      },
    },
    {
      props: {
        amount: new BigNumber(100),
        isApproval: true,
        isAllApproval: true,
      },
      expected: {
        text: 'All',
      },
    },
  ];

  describe('Native', () => {
    it.each(nativeAndErc20Cases)(
      'renders the correct sign and amount for $amount',
      ({ props, expected }) => {
        renderAndExpect({ ...props, asset: NATIVE_ASSET_MOCK }, expected);
      },
    );
  });

  describe('ERC20', () => {
    it.each(nativeAndErc20Cases)(
      'renders the correct sign and amount for $amount',
      ({ props, expected }) => {
        renderAndExpect({ ...props, asset: ERC20_ASSET_MOCK }, expected);
      },
    );
  });

  describe('ERC721', () => {
    const cases = [
      {
        props: { amount: new BigNumber(-1) },
        expected: {
          text: '- #2748',
        },
      },
      {
        props: { amount: new BigNumber(1) },
        expected: {
          text: '+ #2748',
        },
      },
    ];

    it.each(cases)(
      'renders the token ID with just a plus or minus for $expected.text',
      ({ props, expected }) => {
        renderAndExpect({ ...props, asset: ERC721_ASSET_MOCK }, expected);
      },
    );
  });

  describe('ERC1155', () => {
    const cases = [
      {
        props: { amount: new BigNumber(-3) },
        expected: {
          text: '- 3 #2748',
        },
      },
      {
        props: { amount: new BigNumber(8) },
        expected: {
          text: '+ 8 #2748',
        },
      },
      {
        props: { amount: new BigNumber(-12) },
        expected: {
          text: '- 12 #2748',
        },
      },
    ];

    it.each(cases)(
      'renders the correct sign, amount, and token ID for $expected.text',
      ({ props, expected }) => {
        renderAndExpect({ ...props, asset: ERC1155_ASSET_MOCK }, expected);
      },
    );
  });
});
