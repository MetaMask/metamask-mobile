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
import { PreferencesState } from '@metamask/preferences-controller';

// eslint-disable-next-line import/no-namespace
import * as allSelectors from '../../../../app/reducers/collectibles/index.js';
// eslint-disable-next-line import/no-namespace
import * as networkSelectors from '../../../selectors/networkController';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../core/Engine';

import TestHelpers from '../../../../e2e/helpers';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import { mockNetworkState } from '../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

// eslint-disable-next-line import/no-namespace
import * as assetUtils from '../../../util/assets';

const MOCK_ADDRESS = '0xd018538C87232FF95acbCe4870629b75640a78E7';
const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

const mockTrackEvent = jest.fn();

jest.mock('../../../components/hooks/useMetrics');
(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isRemoveGlobalNetworkSelectorEnabled: jest.fn().mockReturnValue(false),
}));

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
// Engine.context.NftController.state
jest.mock('../../../core/Engine', () => ({
  context: {
    NftController: {
      state: {
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
        ignoredNfts: [],
      },
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

describe('CollectibleContracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(networkSelectors, 'selectIsAllNetworks').mockReturnValue(false);
  });
  afterEach(cleanup);
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleContracts />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('does not call updateNftMetadata when isIpfsGatewayEnabled and displayNftMedia are false', async () => {
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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            displayNftMedia: false,
            isIpfsGatewayEnabled: false,
            tokenNetworkFilter: {
              '0x1': true,
            },
          } as unknown as PreferencesState,
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
    const spyOnUpdateNftMetadata = jest
      .spyOn(Engine.context.NftController, 'updateNftMetadata')
      .mockImplementation(async () => undefined);

    renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    await waitFor(() => {
      expect(spyOnUpdateNftMetadata).not.toHaveBeenCalled();
    });

    spyOnUpdateNftMetadata.mockRestore();
  });

  it('UI refresh changes NFT image when metadata image changes - detection disabled', async () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

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
        chainId: '0x1',
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
        chainId: '0x1',
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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': true,
            },
          } as unknown as PreferencesState,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          NftController: {
            allNfts: {
              [MOCK_ADDRESS]: {
                '0x1': nftItemData,
              },
            },
            allNftContracts: {
              [MOCK_ADDRESS]: {
                '0x1': collectibleData,
              },
            },
          },
        },
      },
    };

    const spyOnCollectibles = jest
      .spyOn(allSelectors, 'multichainCollectiblesByEnabledNetworksSelector')
      .mockReturnValue({ '0x1': nftItemData });
    const spyOnContracts = jest
      .spyOn(
        allSelectors,
        'multichainCollectibleContractsByEnabledNetworksSelector',
      )
      .mockReturnValue({ '0x1': collectibleData });
    const spyOnUpdateNftMetadata = jest
      .spyOn(Engine.context.NftController, 'updateNftMetadata')
      .mockImplementation(async () => undefined);

    const { getByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    // The NFT image should be visible by default since it's the first contract (index === 0)
    const nftImageBefore = getByTestId('nft-image');
    expect(nftImageBefore.props.source.uri).toEqual(nftItemData[0].image);

    // Update the mock to return updated data
    spyOnCollectibles.mockReturnValue({ '0x1': nftItemDataUpdated });

    const { queryByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    await waitFor(() => {
      expect(spyOnUpdateNftMetadata).toHaveBeenCalled();
      const nftImageAfter = queryByTestId('nft-image');
      expect(nftImageAfter?.props.source.uri).toEqual(
        nftItemDataUpdated[0].image,
      );
    });

    spyOnCollectibles.mockRestore();
    spyOnContracts.mockRestore();
    spyOnUpdateNftMetadata.mockRestore();
  });

  it('UI refresh changes NFT image when metadata image changes - detection enabled', async () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

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
        chainId: '0x1',
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
        chainId: '0x1',
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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': true,
            },
          } as unknown as PreferencesState,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          NftController: {
            allNfts: {
              [MOCK_ADDRESS]: {
                '0x1': nftItemData,
              },
            },
            allNftContracts: {
              [MOCK_ADDRESS]: {
                '0x1': collectibleData,
              },
            },
          },
        },
      },
    };

    const spyOnCollectibles = jest
      .spyOn(allSelectors, 'multichainCollectiblesByEnabledNetworksSelector')
      .mockReturnValue({ '0x1': nftItemData });
    const spyOnContracts = jest
      .spyOn(
        allSelectors,
        'multichainCollectibleContractsByEnabledNetworksSelector',
      )
      .mockReturnValue({ '0x1': collectibleData });
    const spyOnUpdateNftMetadata = jest
      .spyOn(Engine.context.NftController, 'updateNftMetadata')
      .mockImplementation(async () => undefined);

    const { getByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    // The NFT image should be visible by default since it's the first contract (index === 0)
    const nftImageBefore = getByTestId('nft-image');
    expect(nftImageBefore.props.source.uri).toEqual(nftItemData[0].image);

    // Update the mock to return updated data
    spyOnCollectibles.mockReturnValue({ '0x1': nftItemDataUpdated });

    const { queryByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    await waitFor(() => {
      expect(spyOnUpdateNftMetadata).toHaveBeenCalledTimes(0);
      const nftImageAfter = queryByTestId('nft-image');
      expect(nftImageAfter?.props.source.uri).toEqual(
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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': true,
            },
          } as unknown as PreferencesState,
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
      .spyOn(allSelectors, 'multichainCollectiblesSelector')
      .mockReturnValueOnce({ '0x1': nftItemData })
      .mockReturnValueOnce({ '0x1': nftItemDataUpdated });
    jest
      .spyOn(allSelectors, 'multichainCollectibleContractsSelector')
      .mockReturnValue({ '0x1': collectibleData });
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
            accountsByChainId: {
              '0x1': {
                [CURRENT_ACCOUNT]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': true,
            },
            selectedAddress: CURRENT_ACCOUNT,
            identities: {
              [CURRENT_ACCOUNT]: {
                address: CURRENT_ACCOUNT,
                name: 'Account 1',
              },
            },
          } as unknown as PreferencesState,
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
            accountsByChainId: {
              '0x1': {
                [CURRENT_ACCOUNT]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': true,
            },
            selectedAddress: CURRENT_ACCOUNT,
            identities: {
              [CURRENT_ACCOUNT]: {
                address: CURRENT_ACCOUNT,
                name: 'Account 1',
              },
            },
          } as unknown as PreferencesState,
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

  it('should handle refresh and detect new NFTs', async () => {
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
        description: 'Test NFT',
        favorite: false,
        image: 'https://image.url',
        isCurrentlyOwned: true,
        name: 'Test NFT #1',
        standard: 'ERC721',
        tokenId: '1',
        tokenURI: 'https://token.uri/1',
        chainId: '0x1',
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
            accountsByChainId: {
              '0x1': { [MOCK_ADDRESS]: { balance: '0' } },
            },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': 'true',
            },
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

    jest
      .spyOn(allSelectors, 'multichainCollectiblesSelector')
      .mockReturnValue({ '0x1': nftItemData });
    jest
      .spyOn(allSelectors, 'multichainCollectibleContractsSelector')
      .mockReturnValue({ '0x1': collectibleData });

    const spyOnDetectNfts = jest
      .spyOn(Engine.context.NftDetectionController, 'detectNfts')
      .mockImplementation(async () => undefined);

    const spyOnCheckOwnership = jest
      .spyOn(
        Engine.context.NftController,
        'checkAndUpdateAllNftsOwnershipStatus',
      )
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

    expect(spyOnDetectNfts).toHaveBeenCalledTimes(1);
    expect(spyOnCheckOwnership).toHaveBeenCalledTimes(1);

    spyOnDetectNfts.mockRestore();
    spyOnCheckOwnership.mockRestore();
  });

  it('should track analytics when new NFTs are detected during refresh', async () => {
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
        description: 'Test NFT',
        favorite: false,
        image: 'https://image.url',
        isCurrentlyOwned: true,
        name: 'Test NFT #1',
        standard: 'ERC721',
        tokenId: '1',
        tokenURI: 'https://token.uri/1',
        chainId: '0x1',
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
            accountsByChainId: {
              '0x1': { [MOCK_ADDRESS]: { balance: '0' } },
            },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': 'true',
            },
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

    // Before your tests, add this jest.spyOn
    const mockPrepareNftDetectionEvents = jest.spyOn(
      assetUtils,
      'prepareNftDetectionEvents',
    );
    jest
      .spyOn(allSelectors, 'multichainCollectiblesSelector')
      .mockReturnValue({ '0x1': nftItemData });
    jest
      .spyOn(allSelectors, 'multichainCollectibleContractsSelector')
      .mockReturnValue({ '0x1': collectibleData });

    const mockEvents = [
      { chain_id: 1, source: 'detected' as const },
      { chain_id: 1, source: 'detected' as const },
    ];
    mockPrepareNftDetectionEvents.mockReturnValue(mockEvents);

    const spyOnDetectNfts = jest
      .spyOn(Engine.context.NftDetectionController, 'detectNfts')
      .mockImplementation(async () => undefined);

    const spyOnCheckOwnership = jest
      .spyOn(
        Engine.context.NftController,
        'checkAndUpdateAllNftsOwnershipStatus',
      )
      .mockImplementation(async () => undefined);

    const { getByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    const scrollView = getByTestId('refreshControl');
    const { refreshControl } = scrollView.props;

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    await TestHelpers.delay(1000);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);

    spyOnDetectNfts.mockRestore();
    spyOnCheckOwnership.mockRestore();
  });

  it('should not track analytics when no new NFTs are detected during refresh', async () => {
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
        description: 'Test NFT',
        favorite: false,
        image: 'https://image.url',
        isCurrentlyOwned: true,
        name: 'Test NFT #1',
        standard: 'ERC721',
        tokenId: '1',
        tokenURI: 'https://token.uri/1',
        chainId: '0x1',
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
            accountsByChainId: {
              '0x1': { [MOCK_ADDRESS]: { balance: '0' } },
            },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': 'true',
            },
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

    const mockPrepareNftDetectionEvents = jest.spyOn(
      assetUtils,
      'prepareNftDetectionEvents',
    );
    jest
      .spyOn(allSelectors, 'multichainCollectiblesSelector')
      .mockReturnValue({ '0x1': nftItemData });
    jest
      .spyOn(allSelectors, 'multichainCollectibleContractsSelector')
      .mockReturnValue({ '0x1': collectibleData });

    // Mock to return empty array - no new NFTs detected
    mockPrepareNftDetectionEvents.mockReturnValue([]);

    const spyOnDetectNfts = jest
      .spyOn(Engine.context.NftDetectionController, 'detectNfts')
      .mockImplementation(async () => undefined);

    const spyOnCheckOwnership = jest
      .spyOn(
        Engine.context.NftController,
        'checkAndUpdateAllNftsOwnershipStatus',
      )
      .mockImplementation(async () => undefined);

    const { getByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    const scrollView = getByTestId('refreshControl');
    const { refreshControl } = scrollView.props;

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    await TestHelpers.delay(1000);

    expect(mockTrackEvent).not.toHaveBeenCalled();

    spyOnDetectNfts.mockRestore();
    spyOnCheckOwnership.mockRestore();
  });

  it('navigates to add collectible screen', () => {
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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            displayNftMedia: false,
            isIpfsGatewayEnabled: false,
            tokenNetworkFilter: {
              '0x1': true,
            },
          } as unknown as PreferencesState,
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
    const mockNavigation = {
      navigate: jest.fn(),
      push: jest.fn(),
    };
    const { getByTestId } = renderWithProvider(
      <CollectibleContracts navigation={mockNavigation} />,
      {
        state: mockState,
      },
    );

    const addCollectibleButton = getByTestId('import-collectible-button');
    fireEvent.press(addCollectibleButton);

    expect(mockNavigation.push).toHaveBeenCalledTimes(1);

    expect(mockNavigation.push).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
  });

  it('shows filter controls when evm is selected', () => {
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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            displayNftMedia: false,
            isIpfsGatewayEnabled: false,
            tokenNetworkFilter: {
              '0x1': true,
            },
          } as unknown as PreferencesState,
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
    const mockNavigation = {
      navigate: jest.fn(),
      push: jest.fn(),
    };
    const { getByTestId } = renderWithProvider(
      <CollectibleContracts navigation={mockNavigation} />,
      {
        state: mockState,
      },
    );

    const filterControlersButton = getByTestId('token-network-filter');
    fireEvent.press(filterControlersButton);

    expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
  });

  it('shows network manager when isRemoveGlobalNetworkSelectorEnabled is true', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            displayNftMedia: false,
            isIpfsGatewayEnabled: false,
            tokenNetworkFilter: {
              '0x1': 'true',
            },
          } as unknown as PreferencesState,
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
    const mockNavigation = {
      navigate: jest.fn(),
      push: jest.fn(),
    };
    const { getByTestId } = renderWithProvider(
      <CollectibleContracts navigation={mockNavigation} />,
      {
        state: mockState,
      },
    );

    const filterControlersButton = getByTestId('token-network-filter');
    fireEvent.press(filterControlersButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'NetworkManager',
      }),
    );
  });

  it('filters collectibles by enabled networks when isRemoveGlobalNetworkSelectorEnabled is true', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

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
        description: 'Test NFT',
        favorite: false,
        image: 'https://image.url',
        isCurrentlyOwned: true,
        name: 'Test NFT #1',
        standard: 'ERC721',
        tokenId: '1',
        tokenURI: 'https://token.uri/1',
        chainId: '0x1',
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
            accountsByChainId: {
              '0x1': { [MOCK_ADDRESS]: { balance: '0' } },
            },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            tokenNetworkFilter: {
              '0x1': 'true',
            },
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

    jest
      .spyOn(allSelectors, 'multichainCollectiblesByEnabledNetworksSelector')
      .mockReturnValue({ '0x1': nftItemData });
    jest
      .spyOn(
        allSelectors,
        'multichainCollectibleContractsByEnabledNetworksSelector',
      )
      .mockReturnValue({ '0x1': collectibleData });

    const { getByTestId } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    const nftImage = getByTestId('nft-image');
    expect(nftImage).toBeDefined();
    expect(nftImage.props.source.uri).toEqual(nftItemData[0].image);
  });

  it('shows enabled networks text when isRemoveGlobalNetworkSelectorEnabled is true and multiple networks enabled', () => {
    const networksModule = jest.requireMock('../../../util/networks');
    networksModule.isRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

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
            accountsByChainId: {
              '0x1': {
                [MOCK_ADDRESS]: { balance: '0' },
              },
            },
          },
          PreferencesController: {
            displayNftMedia: false,
            isIpfsGatewayEnabled: false,
            tokenNetworkFilter: {
              '0x1': 'true',
              '0x89': 'true', // Polygon network enabled
            },
          } as unknown as PreferencesState,
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

    const { getByText } = renderWithProvider(<CollectibleContracts />, {
      state: mockState,
    });

    // Should show "All Networks" text when multiple networks are enabled
    expect(getByText('All Networks')).toBeDefined();
  });
});
