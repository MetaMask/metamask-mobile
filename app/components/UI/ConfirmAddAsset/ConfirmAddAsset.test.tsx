import React from 'react';
import ConfirmAddAsset from './ConfirmAddAsset';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../util/test/renderWithProvider';
import useBalance from '../Ramp/hooks/useBalance';
import { toTokenMinimalUnit } from '../../../util/number';
import { fireEvent } from '@testing-library/react-native';
import { BN } from 'ethereumjs-util';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    selectedAsset: [
      {
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        iconUrl: 'https://example.com/usdt.png',
        decimals: 18,
      },
    ],
    networkName: 'Ethereum',
    chainId: '1',
    ticker: 'ETH',
    addTokenList: jest.fn(),
  }),
}));

const mockUseBalanceInitialValue: Partial<ReturnType<typeof useBalance>> = {
  balanceFiat: '$27.02',
  balanceBN: toTokenMinimalUnit('5.36385', 18) as BN,
};

const mockUseBalanceValues: Partial<ReturnType<typeof useBalance>> = {
  ...mockUseBalanceInitialValue,
};

jest.mock('../Ramp/hooks/useBalance', () =>
  jest.fn(() => mockUseBalanceValues),
);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            balance: '200',
          },
          '0xd018538C87232FF95acbCe4870629b75640a78E7': {
            balance: '200',
          },
        },
      },
      NetworkController: {
        providerConfig: {
          chainId: '0xaa36a7',
          type: 'sepolia',
          nickname: 'Sepolia',
        },
      },
    },
  },
};

describe('ConfirmAddAsset', () => {
  it('render matches previous snapshot', () => {
    const wrapper = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });
    expect(wrapper).toMatchSnapshot();
  });
  it('displays selected asset information', () => {
    const { getByText } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });
    expect(getByText('Tether USD')).toBeTruthy();
    expect(getByText('USDT')).toBeTruthy();
    expect(getByText('$27.02')).toBeTruthy();
  });

  it('handles cancel button click', () => {
    const { getByText } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(getByText('Are you sure you want to exit?')).toBeTruthy();
    expect(
      getByText('Your search information will not be saved.'),
    ).toBeTruthy();
  });
});
