import React from 'react';
import ConfirmAddAsset from './ConfirmAddAsset';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import useBalance from '../Ramp/hooks/useBalance';
import { toTokenMinimalUnit } from '../../../util/number';
import { fireEvent } from '@testing-library/react-native';
import BN4 from 'bnjs4';
import { RootState } from '../../../reducers';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useRoute } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddTokenList = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
    useRoute: jest.fn(),
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
        chainId: '0x1',
      },
    ],
    networkName: 'Ethereum Main Network',
    chainId: '0x1',
    ticker: 'ETH',
    addTokenList: mockAddTokenList,
  }),
  useRoute: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

const mockUseBalanceInitialValue: Partial<ReturnType<typeof useBalance>> = {
  balanceFiat: '$27.02',
  balanceBN: toTokenMinimalUnit('5.36385', 18) as BN4,
};

const mockUseBalanceValues: Partial<ReturnType<typeof useBalance>> = {
  ...mockUseBalanceInitialValue,
};

jest.mock('../Ramp/hooks/useBalance', () =>
  jest.fn(() => mockUseBalanceValues),
);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
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
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Mainnet',
          ticker: 'ETH',
        }),
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

  it('should call addTokenList when confirm button is pressed', () => {
    const mockAsset = {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      iconUrl: 'https://example.com/usdt.png',
      decimals: 18,
      chainId: '0x1',
    };

    const mockParams = {
      selectedAsset: [mockAsset],
      networkName: 'Ethereum Main Network',
      addTokenList: mockAddTokenList,
      chainId: '0x1',
      ticker: 'ETH',
    };

    // Mock useRoute
    (useRoute as jest.Mock).mockReturnValue({
      params: mockParams,
    });

    (useParams as jest.Mock).mockReturnValue({
      selectedAsset: [mockAsset],
      networkName: 'Ethereum Main Network',
      chainId: '0x1',
      ticker: 'ETH',
      addTokenList: mockAddTokenList,
    });

    const { getByTestId } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });

    const confirmButton = getByTestId('bottomsheetfooter-button-subsequent'); // adjust testID as needed
    fireEvent.press(confirmButton);

    expect(mockAddTokenList).toHaveBeenCalledTimes(1);
  });
});
