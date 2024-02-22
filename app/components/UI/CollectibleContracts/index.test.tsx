import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContracts from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dangerouslyGetParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

const mockStore = configureMockStore();
const initialState = {
  collectibles: {
    favorites: {},
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('CollectibleContracts', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleContracts />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should only get owned collectibles', () => {
    const CURRENT_ACCOUNT = '0x1a';
    const mockState = {
      collectibles: {
        favorites: {},
      },
      engine: {
        backgroundState: {
          ...initialBackgroundState,
          NetworkController: {
            network: '1',
            providerConfig: {
              ticker: 'ETH',
              type: 'mainnet',
              chainId: '1',
            },
          },
          AccountTrackerController: {
            accounts: { [CURRENT_ACCOUNT]: { balance: '0' } },
          },
          PreferencesController: {
            selectedAddress: CURRENT_ACCOUNT,
            identities: {
              [CURRENT_ACCOUNT]: {
                address: CURRENT_ACCOUNT,
                name: 'Account 1',
              },
            },
          },
          NftController: {
            allNfts: {
              [CURRENT_ACCOUNT]: {
                '1': [
                  {
                    address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
                    description:
                      'Lil Pudgys are a collection of 22,222 randomly generated NFTs minted on Ethereum.',
                    error: 'Opensea import error',
                    favorite: false,
                    image: 'https://api.pudgypenguins.io/lil/image/113',
                    isCurrentlyOwned: true,
                    name: 'Lil Pudgy #113',
                    standard: 'ERC721',
                    tokenId: '113',
                    tokenURI: 'https://api.pudgypenguins.io/lil/113',
                  },
                  {
                    address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
                    description:
                      'Lil Pudgys are a collection of 22,222 randomly generated NFTs minted on Ethereum.',
                    error: 'Opensea import error',
                    favorite: false,
                    image: 'https://api.pudgypenguins.io/lil/image/113',
                    isCurrentlyOwned: false,
                    name: 'Lil Pudgy #114',
                    standard: 'ERC721',
                    tokenId: '114',
                    tokenURI: 'https://api.pudgypenguins.io/lil/114',
                  },
                ],
              },
            },
            allNftContracts: {
              [CURRENT_ACCOUNT]: {
                '1': [
                  {
                    address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
                    name: 'MyToken',
                    symbol: 'MTK',
                  },
                ],
              },
            },
          },
        },
      },
    };
    const { queryByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    const ownedNft = queryByTestId('collectible-Lil Pudgy #113-113');
    const nonOwnedNft = queryByTestId('collectible-Lil Pudgy #114-114');

    expect(ownedNft).toBeTruthy();
    expect(nonOwnedNft).toBeNull();
  });
});
