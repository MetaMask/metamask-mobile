import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import NftGrid from './NftGrid';
import Engine from '../../../core/Engine';
import { Nft } from '@metamask/assets-controllers';
import TestHelpers from '../../../../e2e/helpers';

const mockNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      push: mockPush,
    }),
  };
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  })),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      checkAndUpdateAllNftsOwnershipStatus: jest.fn(),
      removeAndIgnoreNft: jest.fn(),
      addNft: jest.fn(),
      updateNftMetadata: jest.fn(),
    },
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
  },
}));

const selectedAddress = '0x123';

const mockNftData: Nft = {
  address: '0x123',
  tokenId: '1',
  name: 'Test NFT',
  image: 'test.jpg',
  chainId: 1,
  description: 'Test NFT Description',
  standard: 'ERC721',
};

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        accounts: {
          [selectedAddress]: {
            address: selectedAddress,
            balance: '0x0',
          },
        },
        selectedAccount: selectedAddress,
        internalAccounts: {
          accounts: {
            [selectedAddress]: {
              id: selectedAddress,
              address: selectedAddress,
              name: 'Account 1',
              type: 'eip155:e:1',
            },
          },
          selectedAccount: selectedAddress,
        },
      },
      NftController: {
        allNfts: {
          [selectedAddress]: {
            '0x1': [mockNftData],
          },
        },
        ignoredNfts: [],
      },
      PreferencesController: {
        privacyMode: false,
        isIpfsGatewayEnabled: true,
        displayNftMedia: true,
        useNftDetection: true,
        tokenNetworkFilter: { '0x1': true },
      },
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            nativeCurrency: 'ETH',
            name: 'Ethereum Mainnet',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                name: 'Ethereum Mainnet',
                url: 'https://mainnet.infura.io/v3/',
                type: 'infura',
              },
            ],
            defaultRpcEndpointIndex: 0,
            rpcUrl: 'https://mainnet.infura.io/v3/',
            ticker: 'ETH',
            nickname: 'Ethereum Mainnet',
          },
        },
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: { status: 'active' },
        },
      },
      MultichainNetworkController: {
        selectedMultichainNetworkChainId: '0x1',
        multichainNetworkConfigurationsByChainId: {},
      },
    },
  },
  collectibles: {
    allCollectibles: {
      '0x1': [mockNftData],
    },
    ignoredCollectibles: [],
    isNftFetchingProgress: false,
  },
};

const renderComponent = (state = {}) =>
  renderWithProvider(
    <NftGrid chainId="0x1" selectedAddress={selectedAddress} />,
    {
      state,
    },
  );

describe('NftGrid', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    const state = {
      ...initialState,
      collectibles: {
        ...initialState.collectibles,
        isNftFetchingProgress: true,
      },
    };

    const { getByTestId } = renderComponent(state);
    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('renders empty state correctly', () => {
    const { getByTestId } = renderComponent(initialState);
    expect(getByTestId('collectible-contracts')).toBeTruthy();
  });

  it('renders NFT grid when NFTs are present', () => {
    const { getByTestId } = renderComponent(initialState);
    expect(getByTestId('collectible-contracts')).toBeTruthy();
  });

  it('handles refresh correctly', async () => {
    const { getByTestId } = renderComponent(initialState);
    const list = getByTestId('refreshControl');
    expect(list).toBeDefined();

    const { refreshControl } = list.props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    await TestHelpers.delay(1000);

    expect(Engine.context.NftDetectionController.detectNfts).toHaveBeenCalled();
    expect(
      Engine.context.NftController.checkAndUpdateAllNftsOwnershipStatus,
    ).toHaveBeenCalled();
  });
});
