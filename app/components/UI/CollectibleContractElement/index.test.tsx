import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import CollectibleContractElement from '.';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { backgroundState } from '../../../util/test/initial-root-state';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { mockNetworkState } from '../../../util/test/network';

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

describe('CollectibleContractElement Snapshot', () => {
  it('renders correctly', () => {
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

    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleContractElement {...props} />
        </ThemeContext.Provider>
      </Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should render collectible', () => {
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

    fireEvent.press(getAllByTestId('collectible-Collectible1-1')[0]);

    expect(onPressMock).toHaveBeenCalled();
  });
});
