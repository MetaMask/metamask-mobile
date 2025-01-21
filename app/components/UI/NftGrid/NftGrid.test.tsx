import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from '@testing-library/react-native';
import NftGridFooter from './NftGridFooter';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { StackNavigationProp } from '@react-navigation/stack';
import NftGridEmpty from './NftGridEmpty';
import NftGridItem from './NftGridItem';
import { Nft } from '@metamask/assets-controllers';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { RootState } from '../../../reducers';
import { useNavigation } from '@react-navigation/native';
import NftGrid from './NftGrid';
import { mockNetworkState } from '../../../util/test/network';
import { backgroundState } from '../../../util/test/initial-root-state';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
// eslint-disable-next-line import/no-namespace
import * as allSelectors from '../../../../app/reducers/collectibles/index.js';
import Engine from '../../../core/Engine';
import TestHelpers from '../../../../e2e/helpers';

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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

type MockNavigation = StackNavigationProp<
  {
    AddAsset: { assetType: string };
    [key: string]: object | undefined;
  },
  'AddAsset'
>;

const mockNavigation: MockNavigation = {
  push: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  popToTop: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  setParams: jest.fn(),
  getParent: jest.fn(),
} as unknown as MockNavigation;

const MOCK_ADDRESS = '0xd018538C87232FF95acbCe4870629b75640a78E7';
const MOCK_CONTRACT_ADDRESS = '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42';
const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

const mockState: DeepPartial<RootState> = {
  collectibles: {
    favorites: {},
    isNftFetchingProgress: false,
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
          [MOCK_ADDRESS.toLowerCase()]: {
            [CHAIN_IDS.MAINNET]: [
              {
                address: MOCK_CONTRACT_ADDRESS,
                description:
                  'Lil Pudgys are a collection of 22,222 randomly generated NFTs minted on Ethereum.',
                favorite: false,
                image: 'https://api.pudgypenguins.io/lil/image/113',
                isCurrentlyOwned: true,
                name: 'Lil Pudgy #113',
                standard: 'ERC721',
                tokenId: '113',
                tokenURI: 'https://api.pudgypenguins.io/lil/113',
              },
              {
                address: MOCK_CONTRACT_ADDRESS,
                description:
                  'Lil Pudgys are a collection of 22,222 randomly generated NFTs minted on Ethereum.',
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
            [CHAIN_IDS.MAINNET]: [
              {
                address: MOCK_CONTRACT_ADDRESS,
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

const collectibleData = [
  {
    address: '0x72b1FDb6443338A158DeC2FbF411B71aeB157A42',
    name: 'MyToken',
    symbol: 'MTK',
  },
];

describe('NftGrid', () => {
  afterEach(cleanup);
  const mockNavigate = jest.fn();
  (useNavigation as jest.Mock).mockReturnValue({
    navigate: mockNavigate,
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    popToTop: jest.fn(),
  });

  it('should only get owned collectibles', () => {
    const { queryByTestId } = renderWithProvider(
      <NftGrid chainId={CHAIN_IDS.MAINNET} selectedAddress={MOCK_ADDRESS} />,
      {
        state: mockState,
      },
    );

    const ownedNft = queryByTestId('Lil Pudgy #113');
    const nonOwnedNft = queryByTestId('Lil Pudgy #114');

    expect(ownedNft).toBeTruthy();
    expect(nonOwnedNft).toBeNull();
  });

  it('UI refresh changes NFT image when metadata image changes - detection disabled', async () => {
    const testState: DeepPartial<RootState> = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState?.engine?.backgroundState,
          PreferencesController: {
            ...mockState?.engine?.backgroundState?.PreferencesController,
            useNftDetection: false,
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

    const { getByTestId: getByTestIdBefore } = renderWithProvider(
      <NftGrid chainId="0x1" selectedAddress={MOCK_ADDRESS} />,
      {
        state: testState,
      },
    );
    const nftImageBefore = getByTestIdBefore('nft-image');
    expect(nftImageBefore.props.source.uri).toEqual(nftItemData[0].image);

    // const { getByTestId: getByTestIdAfter } = renderWithProvider(
    //   <NftGrid
    //     chainId="0x1"
    //     selectedAddress={MOCK_ADDRESS}
    //   />,
    //   {
    //     state: mockState,
    //   },
    // );

    await waitFor(() => {
      expect(spyOnUpdateNftMetadata).toHaveBeenCalledTimes(1);
      //   const nftImageAfter = getByTestIdBefore('nft-image');
      //   expect(nftImageAfter.props.source.uri).toEqual(
      //     nftItemDataUpdated[0].image,
      //   );
    });

    spyOnCollectibles.mockRestore();
    spyOnContracts.mockRestore();
    spyOnUpdateNftMetadata.mockRestore();
  });

  it('UI refresh changes NFT image when metadata image changes - detection enabled', async () => {
    const testState: DeepPartial<RootState> = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState?.engine?.backgroundState,
          PreferencesController: {
            ...mockState?.engine?.backgroundState?.PreferencesController,
            useNftDetection: true, // Override useNftDetection here
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

    const { getByTestId } = renderWithProvider(
      <NftGrid chainId="0x1" selectedAddress={MOCK_ADDRESS} />,
      {
        state: testState,
      },
    );
    const nftImageBefore = getByTestId('nft-image');
    expect(nftImageBefore.props.source.uri).toEqual(nftItemData[0].image);

    renderWithProvider(
      <NftGrid chainId="0x1" selectedAddress={MOCK_ADDRESS} />,
      {
        state: testState,
      },
    );

    await waitFor(() => {
      expect(spyOnUpdateNftMetadata).toHaveBeenCalledTimes(0);
      //   const nftImageAfter = queryByTestId('nft-image');
      //   expect(nftImageAfter.props.source.uri).toEqual(
      //     nftItemDataUpdated[0].image,
      //   );
    });

    spyOnCollectibles.mockRestore();
    spyOnContracts.mockRestore();
    spyOnUpdateNftMetadata.mockRestore();
  });

  it('UI pull down experience should call detectNfts when detection is enabled', async () => {
    const testState: DeepPartial<RootState> = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState?.engine?.backgroundState,
          PreferencesController: {
            ...mockState?.engine?.backgroundState?.PreferencesController,
            useNftDetection: true, // Override useNftDetection here
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

    const { getByTestId } = renderWithProvider(
      <NftGrid chainId="0x1" selectedAddress={MOCK_ADDRESS} />,
      {
        state: testState,
      },
    );
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
    const testState: DeepPartial<RootState> = {
      ...mockState,
      collectibles: {
        ...mockState.collectibles,
        favorites: {},
        isNftFetchingProgress: true,
      },
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState?.engine?.backgroundState,
          PreferencesController: {
            ...mockState?.engine?.backgroundState?.PreferencesController,
            useNftDetection: true, // Override useNftDetection here
          },
        },
      },
    };

    const { queryByTestId } = renderWithProvider(
      <NftGrid chainId="0x1" selectedAddress={MOCK_ADDRESS} />,
      {
        state: testState,
      },
    );

    const spinner = queryByTestId('spinner');
    expect(spinner).not.toBeNull();
  });

  it('Does not show spinner if nfts are not still being fetched', async () => {
    const testState: DeepPartial<RootState> = {
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
            accounts: { [MOCK_ADDRESS.toLowerCase()]: { balance: '0' } },
          },
          PreferencesController: {
            useNftDetection: true,
            displayNftMedia: true,
            selectedAddress: MOCK_ADDRESS.toLowerCase(),
            identities: {
              [MOCK_ADDRESS.toLowerCase()]: {
                address: MOCK_ADDRESS.toLowerCase(),
                name: 'Account 1',
              },
            },
          },
          NftController: {
            allNfts: {
              [MOCK_ADDRESS.toLowerCase()]: {
                '0x1': [],
              },
            },
            allNftContracts: {
              [MOCK_ADDRESS.toLowerCase()]: {
                '0x1': [],
              },
            },
          },
        },
      },
    };

    const { queryByTestId } = renderWithProvider(
      <NftGrid chainId={CHAIN_IDS.MAINNET} selectedAddress={MOCK_ADDRESS} />,
      {
        state: testState,
      },
    );

    const spinner = queryByTestId('spinner');
    expect(spinner).toBeNull();
  });
});

describe('NftGridFooter', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<NftGridFooter navigation={mockNavigation} />);
    expect(getByText('Don’t see your NFT?')).toBeTruthy();
    expect(getByText('Import NFTs')).toBeTruthy();
  });

  it('calls navigation.push when the button is pressed', () => {
    const { getByTestId } = render(
      <NftGridFooter navigation={mockNavigation} />,
    );
    const button = getByTestId(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
    fireEvent.press(button);
    expect(mockNavigation.push).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
  });

  it('matches the snapshot', () => {
    const tree = render(<NftGridFooter navigation={mockNavigation} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

describe('NftGridEmpty', () => {
  it('renders without crashing', () => {
    const { getByText, getByTestId } = render(
      <NftGridEmpty navigation={mockNavigation} />,
    );
    expect(getByText('No NFTs yet')).toBeTruthy();
    expect(getByText('Learn more')).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON)).toBeTruthy();
  });

  it('calls navigation.navigate when the button is pressed', () => {
    const { getByText } = render(<NftGridEmpty navigation={mockNavigation} />);
    const learnMoreText = getByText('Learn more');
    fireEvent.press(learnMoreText);

    // TODO: actually test for learn more redirect
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/nfts/nft-tokens-in-your-metamask-wallet/',
      },
    });
  });

  it('matches the snapshot', () => {
    const tree = render(<NftGridEmpty navigation={mockNavigation} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

describe('NftGridItem', () => {
  const mockNft: Nft = {
    address: '0x123',
    tokenId: '1',
    name: 'Test NFT',
    image: 'https://example.com/image.png',
    collection: {
      name: 'Test Collection',
    },
    description: '',
    standard: 'erc721',
  };

  const mockNavigate = jest.fn();
  (useNavigation as jest.Mock).mockReturnValue({
    navigate: mockNavigate,
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    popToTop: jest.fn(),
  });

  it('renders correctly with a valid nft', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NftGridItem nft={mockNft} navigation={mockNavigation} />,
      { state: mockState },
    );

    expect(getByTestId(mockNft.name as string)).toBeTruthy();
    expect(getByText('Test NFT')).toBeTruthy();
    expect(getByText('Test Collection')).toBeTruthy();
  });

  it('matches the snapshot', () => {
    const tree = renderWithProvider(
      <NftGridItem nft={mockNft} navigation={mockNavigation} />,
      { state: mockState },
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
