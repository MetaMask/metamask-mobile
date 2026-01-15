import React from 'react';
import { render } from '@testing-library/react-native';
import MultiAssetListItems from './MultiAssetListItems';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';

const mockProviderConfig = {
  type: 'mainnet',
};

const mockSearchResults = [
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    image: 'https://example.com/usdt.png',
    decimals: 6,
    chainId: '0x1' as const,
  },
];

const mockSelectedAsset = [
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    image: 'https://example.com/usdt.png',
    decimals: 6,
    chainId: '0x1' as const,
  },
];

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../util/networks', () => ({
  getNetworkImageSource: jest.fn().mockReturnValue('mockedImageSource'),
}));

jest.mock('../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn().mockReturnValue('mockedImageSource'),
}));

describe('MultiAssetListItems', () => {
  afterEach(() => {
    (useSelector as jest.Mock).mockClear();
  });

  it('render matches previous snapshot', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const { toJSON } = render(
      <MultiAssetListItems
        searchResults={[]}
        handleSelectAsset={() => ({})}
        selectedAsset={[]}
        searchQuery="USDT"
        chainId="1"
        networkName="Ethereum"
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
  it('renders no tokens found message when searchResults are empty and searchQuery is provided', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const { getByText } = render(
      <MultiAssetListItems
        searchResults={[]}
        handleSelectAsset={() => ({})}
        selectedAsset={[]}
        searchQuery="USDT"
        chainId="1"
        networkName="Ethereum"
      />,
    );

    expect(
      getByText("We couldn't find any tokens with that name."),
    ).toBeOnTheScreen();
  });

  it('renders search results correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const { getByText } = render(
      <MultiAssetListItems
        searchResults={mockSearchResults}
        handleSelectAsset={() => ({})}
        selectedAsset={mockSelectedAsset}
        searchQuery=""
        chainId="1"
        networkName="Ethereum"
      />,
    );

    expect(getByText('Tether USD')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
  });

  it('renders AssetIcon when asset has image property', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const { getByText } = render(
      <MultiAssetListItems
        searchResults={mockSearchResults}
        handleSelectAsset={() => ({})}
        selectedAsset={[]}
        searchQuery=""
        chainId="1"
        networkName="Ethereum"
      />,
    );

    // Asset should render with name and symbol when image exists
    expect(getByText('Tether USD')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
  });

  it('does not render AssetIcon when asset image is missing', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const assetWithoutImage = [
      {
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        chainId: '0x1' as const,
      },
    ];

    const { getByText } = render(
      <MultiAssetListItems
        searchResults={assetWithoutImage}
        handleSelectAsset={() => ({})}
        selectedAsset={[]}
        searchQuery=""
        chainId="1"
        networkName="Ethereum"
      />,
    );

    // Asset should still render with name and symbol even without image
    expect(getByText('Tether USD')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
  });

  it('renders all search results with FlashList', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const manyResults = Array.from({ length: 10 }, (_, i) => ({
      address: `0x${i.toString().padStart(40, '0')}`,
      symbol: `TOKEN${i}`,
      name: `Token ${i}`,
      image: `https://example.com/token${i}.png`,
      decimals: 18,
      chainId: '0x1' as const,
    }));

    const { getByText } = render(
      <MultiAssetListItems
        searchResults={manyResults}
        handleSelectAsset={() => ({})}
        selectedAsset={[]}
        searchQuery=""
        chainId="1"
        networkName="Ethereum"
      />,
    );

    // Should render all 10 items, not just first 6
    expect(getByText('Token 0')).toBeOnTheScreen();
    expect(getByText('Token 9')).toBeOnTheScreen();
    expect(getByText('TOKEN0')).toBeOnTheScreen();
    expect(getByText('TOKEN9')).toBeOnTheScreen();
  });

  it('renders already added tokens with alreadyAddedTokens prop', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const alreadyAddedTokens = new Set<string>([
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
    ]);

    const { getByTestId, getByText } = render(
      <MultiAssetListItems
        searchResults={mockSearchResults}
        handleSelectAsset={() => ({})}
        selectedAsset={[]}
        searchQuery=""
        chainId="1"
        networkName="Ethereum"
        alreadyAddedTokens={alreadyAddedTokens}
      />,
    );

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
    ).toBeOnTheScreen();
    expect(getByText('Tether USD')).toBeOnTheScreen();
  });

  it('marks already added tokens as disabled', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const alreadyAddedTokens = new Set<string>([
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
    ]);

    const { getByTestId } = render(
      <MultiAssetListItems
        searchResults={mockSearchResults}
        handleSelectAsset={() => ({})}
        selectedAsset={[]}
        searchQuery=""
        chainId="1"
        networkName="Ethereum"
        alreadyAddedTokens={alreadyAddedTokens}
      />,
    );

    const listItem = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    expect(listItem).toHaveProp('disabled', true);
  });
});
