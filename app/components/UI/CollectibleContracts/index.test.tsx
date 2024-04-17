import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContracts from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../util/test/renderWithProvider';

// eslint-disable-next-line import/no-namespace
import * as allSelectors from '../../../../app/reducers/collectibles/index.js';
import { cleanup, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import {
  createMockInternalAccount,
  createMockUUIDFromAddress,
} from '../../../selectors/accountsController.test';
import { AccountsControllerState } from '@metamask/accounts-controller';

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

jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      addNft: jest.fn(),
      updateNftMetadata: jest.fn(),
      checkAndUpdateAllNftsOwnershipStatus: jest.fn(),
    },
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
  },
}));

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
  afterEach(cleanup);
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleContracts />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should only get owned collectibles', () => {
    const MOCK_ADDRESS = '0xd018538C87232FF95acbCe4870629b75640a78E7';
    const expectedUUID = createMockUUIDFromAddress(MOCK_ADDRESS);

    const internalAccount1 = createMockInternalAccount(
      MOCK_ADDRESS.toLowerCase(),
      'Account 1',
    );

    const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
      internalAccounts: {
        accounts: {
          [expectedUUID]: internalAccount1,
        },
        selectedAccount: expectedUUID,
      },
    };

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
              chainId: '0x1',
            },
          },
          AccountTrackerController: {
            accounts: { [MOCK_ADDRESS]: { balance: '0' } },
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          NftController: {
            allNfts: {
              [MOCK_ADDRESS]: {
                '0x1': [
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
              [MOCK_ADDRESS]: {
                '0x1': [
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

  it('UI refresh changes NFT image when metadata image changes', async () => {
    const MOCK_ADDRESS = '0xd018538C87232FF95acbCe4870629b75640a78E7';
    const expectedUUID = createMockUUIDFromAddress(MOCK_ADDRESS);

    const internalAccount1 = createMockInternalAccount(
      MOCK_ADDRESS.toLowerCase(),
      'Account 1',
    );

    const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
      internalAccounts: {
        accounts: {
          [expectedUUID]: internalAccount1,
        },
        selectedAccount: expectedUUID,
      },
    };
    const collectibleData = [
      {
        address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
        name: 'MyToken',
        symbol: 'MTK',
      },
    ];
    const nftItemData = [
      {
        address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
        description:
          'Lil Pudgys are a collection of 22,222 randomly generated NFTs minted on Ethereum.',
        error: 'Opensea import error',
        favorite: false,
        image: 'https://api.pudgypenguins.io/lil/image/11222',
        isCurrentlyOwned: true,
        name: 'Lil Pudgy #113',
        standard: 'ERC721',
        tokenId: '113',
        tokenURI: 'https://api.pudgypenguins.io/lil/113',
      },
    ];

    const nftItemDataUpdated = [
      {
        address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
        description:
          'Lil Pudgys are a collection of 22,222 randomly generated NFTs minted on Ethereum.',
        error: 'Opensea import error',
        favorite: false,
        image: 'https://api.pudgypenguins.io/lil/image/updated.png',
        isCurrentlyOwned: true,
        name: 'Lil Pudgy #113',
        standard: 'ERC721',
        tokenId: '113',
        tokenURI: 'https://api.pudgypenguins.io/lil/113',
      },
    ];
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
            accounts: { [MOCK_ADDRESS]: { balance: '0' } },
          },
          PreferencesController: {
            displayNftMedia: true,
            selectedAddress: MOCK_ADDRESS,
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          NftController: {
            addNft: jest.fn(),
            updateNftMetadata: jest.fn(),
            allNfts: {
              [MOCK_ADDRESS]: {
                '1': [],
              },
            },
            allNftContracts: {
              [MOCK_ADDRESS]: {
                '1': [],
              },
            },
          },
        },
      },
    };

    const spyOnCollectibles = jest
      .spyOn(allSelectors, 'collectiblesSelector')
      .mockReturnValueOnce(nftItemData)
      .mockReturnValueOnce(nftItemDataUpdated);
    const spyOnContracts = jest
      .spyOn(allSelectors, 'collectibleContractsSelector')
      .mockReturnValue(collectibleData);
    const spyOnUpdateNftMetadata = jest
      .spyOn(Engine.context.NftController, 'updateNftMetadata')
      .mockImplementation(async () => undefined);

    const { getByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });
    const nftImageBefore = getByTestId('nft-image');
    expect(nftImageBefore.props.source.uri).toEqual(nftItemData[0].image);

    const { queryByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    await waitFor(() => {
      expect(spyOnUpdateNftMetadata).toHaveBeenCalled();
      const nftImageAfter = queryByTestId('nft-image');
      expect(nftImageAfter.props.source.uri).toEqual(
        nftItemDataUpdated[0].image,
      );
    });

    spyOnCollectibles.mockRestore();
    spyOnContracts.mockRestore();
    spyOnUpdateNftMetadata.mockRestore();
  });
});
