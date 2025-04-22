import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import CollectibleContractElement from '.';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { backgroundState } from '../../../util/test/initial-root-state';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { mockNetworkState } from '../../../util/test/network';
import Engine from '../../../core/Engine';
import { removeNft } from './util';

const mockStore = configureStore([]);
const initialState = {
  collectibleContracts: [
    { address: '0xdef', name: 'Test Contract', logo: 'logo.png' },
  ],
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
      PreferencesController: {
        useTokenDetection: false,
      },
      AddressBookController: {
        addressBook: {
          '0x1': {
            '0x519d2CE57898513F676a5C3b66496c3C394c9CC7': {
              address: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
              name: 'Account 2',
            },
          },
        },
      },
      NftController: {
        allNftContracts: {
          allNfts: {
            '0x123': {
              [CHAIN_IDS.MAINNET]: [
                {
                  address: '0x72b1FDb6443338A158DeC2FbF411B71123456789',
                  description: 'Description of NFT 1',
                  favorite: false,
                  image: 'https://image.com/113',
                  isCurrentlyOwned: true,
                  name: 'My Nft #113',
                  standard: 'ERC721',
                  tokenId: '113',
                  tokenURI:
                    'https://opensea.io/assets/0x72b1FDb6443338A158DeC2FbF411B71123456789/113',
                },
              ],
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: '1',
            accounts: {
              '1': {
                address: '0x123',
              },
            },
          },
        },
      },
    },
  },
};
const store = mockStore(initialState);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('CollectibleContractElement', () => {
  it('render matches snapshot', () => {
    // Provide the props that are required by the component.
    const onPressMock = jest.fn();
    const removeFavoriteMock = jest.fn();

    const props = {
      asset: {
        favorites: false,
        name: 'AssetName',
        logo: 'asset-logo.png',
        address: '0xdef',
      },
      contractCollectibles: [
        { address: '0xdef', tokenId: '1', name: 'Collectible1' },
        { address: '0xdef', tokenId: '2', name: 'Collectible2' },
        { address: '0xdef', tokenId: '3', name: 'Collectible3' },
        { address: '0xdef', tokenId: '4', name: 'Collectible4' },
      ],
      collectiblesVisible: true,
      onPress: onPressMock,
      removeFavoriteCollectible: removeFavoriteMock,
    };

    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleContractElement {...props} />
        </ThemeContext.Provider>
      </Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  describe('List element', () => {
    it('shows collectibles list when collectiblesVisible is true', () => {
      // Provide the props that are required by the component.
      const onPressMock = jest.fn();
      const removeFavoriteMock = jest.fn();

      const props = {
        asset: { favorites: false, name: 'AssetName', logo: 'asset-logo.png' },
        contractCollectibles: [
          { address: '0xdef', tokenId: '1', name: 'Collectible1' },
          { address: '0xdef', tokenId: '2', name: 'Collectible2' },
          { address: '0xdef', tokenId: '3', name: 'Collectible3' },
          { address: '0xdef', tokenId: '4', name: 'Collectible4' },
        ],
        collectiblesVisible: true,
        onPress: onPressMock,
        removeFavoriteCollectible: removeFavoriteMock,
      };

      const { getAllByTestId } = render(
        <Provider store={store}>
          <ThemeContext.Provider value={mockTheme}>
            <CollectibleContractElement {...props} />
          </ThemeContext.Provider>
        </Provider>,
      );

      expect(getAllByTestId('collectible-Collectible1-1')).toBeTruthy();
      expect(getAllByTestId('collectible-Collectible2-2')).toBeTruthy();
      expect(getAllByTestId('collectible-Collectible3-3')).toBeTruthy();
      expect(getAllByTestId('collectible-Collectible4-4')).toBeTruthy();

      fireEvent.press(getAllByTestId('collectible-Collectible1-1')[0]);

      expect(onPressMock).toHaveBeenCalled();
    });

    it('hides collectibles list when pressed', async () => {
      const onPressMock = jest.fn();
      const removeFavoriteMock = jest.fn();

      const props = {
        asset: {
          favorites: false,
          name: 'AssetName',
          logo: 'asset-logo.png',
          address: '0xdef',
        },
        contractCollectibles: [
          { address: '0xdef', tokenId: '1', name: 'Collectible11' },
        ],
        collectiblesVisible: true,
        onPress: onPressMock,
        removeFavoriteCollectible: removeFavoriteMock,
      };

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <ThemeContext.Provider value={mockTheme}>
            <CollectibleContractElement {...props} />
          </ThemeContext.Provider>
        </Provider>,
      );
      fireEvent.press(
        getByTestId('collectible-contract-element-0xdef-AssetName'),
      );
      expect(queryByTestId('collectible-Collectible11-1')).toBeNull();
    });
  });
});

describe('removeNft', () => {
  const mockRemoveFavoriteCollectible = jest.fn();
  const mockRemoveAndIgnoreNft = jest.fn();
  const mockLongPressedCollectible = {
    current: {
      address: '0x123',
      tokenId: '456',
      chainId: '1',
    },
  };
  const mockNetworkConfigurations = {
    '0x1': {
      rpcEndpoints: [
        {
          networkClientId: 'test-network-client-id',
        },
      ],
      defaultRpcEndpointIndex: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(Engine.context, {
      NftController: {
        removeAndIgnoreNft: mockRemoveAndIgnoreNft,
      },
    });
  });

  it('should remove NFT and call necessary functions', () => {
    removeNft({
      selectedAddress: '0x789',
      chainId: '1',
      longPressedCollectible: mockLongPressedCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: mockNetworkConfigurations,
    });

    expect(mockRemoveFavoriteCollectible).toHaveBeenCalledWith(
      '0x789',
      '1',
      mockLongPressedCollectible.current,
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0x123', '456', {
      networkClientId: 'test-network-client-id',
      userAddress: '0x789',
    });
  });

  it('should handle missing network configuration gracefully', () => {
    const networkConfigWithoutRpc = {
      '0x1': {
        rpcEndpoints: [],
        defaultRpcEndpointIndex: 0,
      },
    };

    removeNft({
      selectedAddress: '0x789',
      chainId: '1',
      longPressedCollectible: mockLongPressedCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: networkConfigWithoutRpc,
    });

    expect(mockRemoveFavoriteCollectible).toHaveBeenCalledWith(
      '0x789',
      '1',
      mockLongPressedCollectible.current,
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0x123', '456', {
      networkClientId: undefined,
      userAddress: '0x789',
    });
  });

  it('should handle missing RPC endpoint gracefully', () => {
    const networkConfigWithoutRpc = {
      '0x1': {
        rpcEndpoints: [],
        defaultRpcEndpointIndex: 0,
      },
    };

    removeNft({
      selectedAddress: '0x789',
      chainId: '1',
      longPressedCollectible: mockLongPressedCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: networkConfigWithoutRpc,
    });

    expect(mockRemoveFavoriteCollectible).toHaveBeenCalledWith(
      '0x789',
      '1',
      mockLongPressedCollectible.current,
    );

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith('0x123', '456', {
      networkClientId: undefined,
      userAddress: '0x789',
    });
  });

  it('should call NftController with correct arguments', () => {
    const mockCollectible = {
      current: {
        address: '0xabc123',
        tokenId: '789',
        chainId: '1',
      },
    };

    const mockConfig = {
      '0x1': {
        rpcEndpoints: [
          {
            networkClientId: 'specific-network-id',
          },
        ],
        defaultRpcEndpointIndex: 0,
      },
    };

    removeNft({
      selectedAddress: '0xdef456',
      chainId: '1',
      longPressedCollectible: mockCollectible,
      removeFavoriteCollectible: mockRemoveFavoriteCollectible,
      networkConfigurations: mockConfig,
    });

    expect(mockRemoveAndIgnoreNft).toHaveBeenCalledWith(
      '0xabc123', // NFT address
      '789', // tokenId
      {
        networkClientId: 'specific-network-id',
        userAddress: '0xdef456',
      },
    );
  });
});
