import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import NftGrid from './NftGrid';
import { Nft } from '@metamask/assets-controllers';

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

jest.mock('react-native', () => ({
  View: 'View',
  RefreshControl: 'RefreshControl',
}));

jest.mock('@shopify/flash-list', () => {
  function MockMasonryFlashList({
    data,
    renderItem,
    testID,
  }: {
    data: Nft[];
    renderItem: (props: { item: Nft; index: number }) => React.ReactElement;
    testID?: string;
  }) {
    return (
      <div data-testid={testID}>
        {data.map((item, index) => renderItem({ item, index }))}
      </div>
    );
  }

  return { MasonryFlashList: MockMasonryFlashList };
});

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

    renderComponent(state);
    expect(screen.getByTestId('spinner')).toBeOnTheScreen();
  });

  it('renders empty state correctly', () => {
    const state = {
      ...initialState,
      collectibles: {
        ...initialState.collectibles,
        allCollectibles: {},
      },
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          NftController: {
            ...initialState.engine.backgroundState.NftController,
            allNfts: {
              [selectedAddress]: {
                '0x1': [], // Empty array for mainnet NFTs
              },
            },
          },
        },
      },
    };

    renderComponent(state);
    expect(screen.getByTestId('collectible-contracts')).toBeOnTheScreen();
    expect(screen.getByTestId('nft-empty-text')).toBeOnTheScreen();
  });

  it('renders NFT grid when NFTs are present', () => {
    renderComponent(initialState);
    expect(screen.getByTestId('collectible-contracts')).toBeOnTheScreen();
    expect(screen.getByTestId('Test NFT')).toBeOnTheScreen();
  });

  it('handles NFT menu actions', async () => {
    renderComponent(initialState);
    // TODO: Implement menu actions test
  });

  it('respects privacy mode', () => {
    const state = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            ...initialState.engine.backgroundState.PreferencesController,
            privacyMode: true,
          },
        },
      },
    };

    renderComponent(state);
    // TODO: Implement privacy mode test
  });

  it('filters NFTs by network', () => {
    // Test case 1: Network is filtered out (disabled)
    const filteredState = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            ...initialState.engine.backgroundState.PreferencesController,
            tokenNetworkFilter: { '0x89': true },
          },
        },
      },
    };

    renderComponent(filteredState);
    // When network is filtered out, we should see the empty state
    expect(screen.getByTestId('collectible-contracts')).toBeOnTheScreen();
    expect(screen.getByTestId('nft-empty-text')).toBeOnTheScreen();
    // The NFT should not be visible
    expect(screen.queryByTestId('Test NFT')).not.toBeOnTheScreen();
  });

  it('shows collectible detection modal when NFT detection is disabled', () => {
    const state = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            ...initialState.engine.backgroundState.PreferencesController,
            useNftDetection: false,
          },
        },
      },
    };

    renderComponent(state);

    // Verify the modal is shown
    expect(
      screen.getByTestId('collectible-detection-modal-button'),
    ).toBeOnTheScreen();

    // Verify the modal is not shown when NFT detection is enabled
    const enabledState = {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...state.engine.backgroundState,
          PreferencesController: {
            ...state.engine.backgroundState.PreferencesController,
            useNftDetection: true,
          },
        },
      },
    };

    renderComponent(enabledState);
    expect(
      screen.queryByTestId('collectible-detection-modal-button'),
    ).not.toBeOnTheScreen();
  });
});
