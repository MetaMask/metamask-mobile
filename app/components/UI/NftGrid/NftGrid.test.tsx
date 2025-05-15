import React from 'react';
import { screen, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import NftGrid, {
  handleNftRefresh,
  handleNftRemoval,
  handleNftMetadataRefresh,
} from './NftGrid';
import { Nft } from '@metamask/assets-controllers';
import Engine from '../../../core/Engine';
import { removeFavoriteCollectible } from '../../../actions/collectibles';

const mockNavigate = jest.fn();
const mockPush = jest.fn();

export const RefreshTestId = 'refreshControl';
export const SpinnerTestId = 'spinner';

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

jest.mock('../../../actions/collectibles', () => ({
  removeFavoriteCollectible: jest.fn(),
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

  it('updates NFT metadata when needed', async () => {
    const mockUpdateMetadata = jest.fn().mockResolvedValue(undefined);
    Engine.context.NftController.updateNftMetadata = mockUpdateMetadata;

    // Create state with NFTs that need metadata update
    const stateWithUpdatableNfts = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            ...initialState.engine.backgroundState.PreferencesController,
            useNftDetection: false, // Disable NFT detection to trigger manual update
            isIpfsGatewayEnabled: true,
            displayNftMedia: true,
          },
        },
      },
    };

    renderComponent(stateWithUpdatableNfts);

    // Wait for useEffect to trigger metadata update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Verify metadata update was called
    expect(mockUpdateMetadata).toHaveBeenCalledWith({
      nfts: expect.any(Array),
      userAddress: selectedAddress,
    });
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

    // Verify NFT grid item is rendered with privacy mode
    const nftItem = screen.getByTestId('Test NFT');
    // Verify CollectibleMedia component receives privacy mode prop
    const collectibleMedia = nftItem.findByProps({ privacyMode: true });
    expect(collectibleMedia).toBeTruthy();
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

describe('handleNftRefresh', () => {
  it('should trigger NFT detection and ownership check', async () => {
    const mockDetectNfts = jest.fn().mockResolvedValue(undefined);
    const mockCheckOwnership = jest.fn().mockResolvedValue(undefined);

    Engine.context.NftDetectionController.detectNfts = mockDetectNfts;
    Engine.context.NftController.checkAndUpdateAllNftsOwnershipStatus =
      mockCheckOwnership;

    await act(async () => {
      await handleNftRefresh(['0x1']);
    });

    // Verify NFT operations were called
    expect(mockDetectNfts).toHaveBeenCalledWith(['0x1']);
    expect(mockCheckOwnership).toHaveBeenCalled();
  });
});

describe('handleNftRemoval', () => {
  it('should remove NFT and update favorites', () => {
    const mockRemoveAndIgnoreNft = jest.fn();
    Engine.context.NftController.removeAndIgnoreNft = mockRemoveAndIgnoreNft;

    const nft = {
      address: '0x123',
      tokenId: '1',
    };
    const chainId = '0x1';
    const testAddress = '0x456';

    handleNftRemoval(nft, chainId, testAddress);

    expect(removeFavoriteCollectible).toHaveBeenCalledWith(
      testAddress,
      chainId,
      nft,
    );
    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith(
      nft.address,
      nft.tokenId,
    );
  });
});

describe('handleNftMetadataRefresh', () => {
  it('should refresh NFT metadata', () => {
    const mockAddNft = jest.fn();
    Engine.context.NftController.addNft = mockAddNft;

    const nft = {
      address: '0x123',
      tokenId: '1',
    };

    handleNftMetadataRefresh(nft);

    expect(mockAddNft).toHaveBeenCalledWith(nft.address, nft.tokenId);
  });
});
