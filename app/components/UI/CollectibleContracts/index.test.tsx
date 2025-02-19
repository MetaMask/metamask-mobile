import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContracts from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-hooks';

// eslint-disable-next-line import/no-namespace
import * as allSelectors from '../../../../app/reducers/collectibles/index.js';
import { cleanup, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';

import TestHelpers from '../../../../e2e/helpers';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';

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
    backgroundState,
  },
};
const store = mockStore(initialState);

const MOCK_ADDRESS = '0xd018538C87232FF95acbCe4870629b75640a78E7';
const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

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

  it('UI refresh changes NFT image when metadata image changes - detection disabled', async () => {
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
    const mockState: DeepPartial<RootState> = {
      collectibles: {
        favorites: {},
      },
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
          AccountTrackerController: {
            accounts: { [MOCK_ADDRESS]: { balance: '0' } },
          },
          PreferencesController: {
            displayNftMedia: true,
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          NftController: {
            allNfts: {
              [MOCK_ADDRESS]: {
                '0x1': [],
              },
            },
            allNftContracts: {
              [MOCK_ADDRESS]: {
                '0x1': [],
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

  it('UI refresh changes NFT image when metadata image changes - detection enabled', async () => {
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
    const mockState: DeepPartial<RootState> = {
      collectibles: {
        favorites: {},
      },
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
          AccountTrackerController: {
            accounts: { [MOCK_ADDRESS]: { balance: '0' } },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          NftController: {
            allNfts: {
              [MOCK_ADDRESS]: {
                '0x1': [],
              },
            },
            allNftContracts: {
              [MOCK_ADDRESS]: {
                '0x1': [],
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
      expect(spyOnUpdateNftMetadata).toHaveBeenCalledTimes(0);
      const nftImageAfter = queryByTestId('nft-image');
      expect(nftImageAfter.props.source.uri).toEqual(
        nftItemDataUpdated[0].image,
      );
    });

    spyOnCollectibles.mockRestore();
    spyOnContracts.mockRestore();
    spyOnUpdateNftMetadata.mockRestore();
  });

  it('UI pull down experience should call detectNfts when detection is enabled', async () => {
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
    const mockState: DeepPartial<RootState> = {
      collectibles: {
        favorites: {},
      },
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
          AccountTrackerController: {
            accounts: { [MOCK_ADDRESS]: { balance: '0' } },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
          },
          NftController: {
            allNfts: {
              [MOCK_ADDRESS]: {
                '0x1': [],
              },
            },
            allNftContracts: {
              [MOCK_ADDRESS]: {
                '0x1': [],
              },
            },
          },
        },
      },
    };

    jest
      .spyOn(allSelectors, 'collectiblesSelector')
      .mockReturnValueOnce(nftItemData)
      .mockReturnValueOnce(nftItemDataUpdated);
    jest
      .spyOn(allSelectors, 'collectibleContractsSelector')
      .mockReturnValue(collectibleData);
    const spyOnUpdateNftMetadata = jest
      .spyOn(Engine.context.NftController, 'updateNftMetadata')
      .mockImplementation(async () => undefined);

    const spyOnDetectNfts = jest
      .spyOn(Engine.context.NftDetectionController, 'detectNfts')
      .mockImplementation(async () => undefined);

    const { getByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });
    const scrollView = getByTestId('refreshControl');

    expect(scrollView).toBeDefined();

    const { refreshControl } = scrollView.props;
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    await TestHelpers.delay(1000);

    expect(spyOnUpdateNftMetadata).toHaveBeenCalledTimes(0);
    expect(spyOnDetectNfts).toHaveBeenCalledTimes(1);
  });

  it('shows spinner if nfts are still being fetched', async () => {
    const CURRENT_ACCOUNT = '0x1a';
    const mockState: DeepPartial<RootState> = {
      collectibles: {
        favorites: {},
        isNftFetchingProgress: true,
      },
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
          AccountTrackerController: {
            accounts: { [CURRENT_ACCOUNT]: { balance: '0' } },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
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
                '0x1': [],
              },
            },
            allNftContracts: {
              [CURRENT_ACCOUNT]: {
                '0x1': [],
              },
            },
          },
        },
      },
    };
    const { queryByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    const spinner = queryByTestId('spinner');
    expect(spinner).not.toBeNull();
  });

  it('Does not show spinner if nfts are not still being fetched', async () => {
    const CURRENT_ACCOUNT = '0x1a';
    const mockState: DeepPartial<RootState> = {
      collectibles: {
        favorites: {},
      },
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
          AccountTrackerController: {
            accounts: { [CURRENT_ACCOUNT]: { balance: '0' } },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
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
                '0x1': [],
              },
            },
            allNftContracts: {
              [CURRENT_ACCOUNT]: {
                '0x1': [],
              },
            },
          },
        },
      },
    };

    const { queryByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    const spinner = queryByTestId('spinner');
    expect(spinner).toBeNull();
  });
});
