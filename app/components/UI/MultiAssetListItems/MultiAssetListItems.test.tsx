import React from 'react';
import { render } from '@testing-library/react-native';
import MultiAssetListItems from './MultiAssetListItems';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';

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

  describe('Already Added Tokens', () => {
    it('marks tokens as selected when they are in alreadyAddedTokens', () => {
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

      expect(listItem).toHaveProp('isSelected', true);
    });

    it('marks tokens as disabled when they are in alreadyAddedTokens', () => {
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

      expect(listItem).toHaveProp('isDisabled', true);
    });

    it('does not call handleSelectAsset when pressing disabled token', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectProviderConfig) return mockProviderConfig;
      });

      const handleSelectAsset = jest.fn();
      const alreadyAddedTokens = new Set<string>([
        '0xdac17f958d2ee523a2206206994597c13d831ec7',
      ]);

      const { getByTestId } = render(
        <MultiAssetListItems
          searchResults={mockSearchResults}
          handleSelectAsset={handleSelectAsset}
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

      listItem.props.onPress();

      expect(handleSelectAsset).not.toHaveBeenCalled();
    });

    it('allows selection of tokens not in alreadyAddedTokens', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectProviderConfig) return mockProviderConfig;
      });

      const handleSelectAsset = jest.fn();
      const alreadyAddedTokens = new Set<string>(['0xdifferentaddress']);

      const { getByTestId } = render(
        <MultiAssetListItems
          searchResults={mockSearchResults}
          handleSelectAsset={handleSelectAsset}
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

      expect(listItem).toHaveProp('isDisabled', false);
      expect(listItem).toHaveProp('isSelected', false);

      listItem.props.onPress();

      expect(handleSelectAsset).toHaveBeenCalledWith(mockSearchResults[0]);
    });

    it('handles case-insensitive address matching', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectProviderConfig) return mockProviderConfig;
      });

      const alreadyAddedTokens = new Set<string>([
        '0xDAC17F958D2EE523A2206206994597C13D831EC7',
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

      expect(listItem).toHaveProp('isDisabled', true);
      expect(listItem).toHaveProp('isSelected', true);
    });

    it('renders correctly when alreadyAddedTokens is undefined', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectProviderConfig) return mockProviderConfig;
      });

      const handleSelectAsset = jest.fn();

      const { getByTestId } = render(
        <MultiAssetListItems
          searchResults={mockSearchResults}
          handleSelectAsset={handleSelectAsset}
          selectedAsset={[]}
          searchQuery=""
          chainId="1"
          networkName="Ethereum"
        />,
      );

      const listItem = getByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      );

      expect(listItem).toHaveProp('isDisabled', false);
      expect(listItem).toHaveProp('isSelected', false);

      listItem.props.onPress();

      expect(handleSelectAsset).toHaveBeenCalledWith(mockSearchResults[0]);
    });

    it('shows both manually selected and already added tokens as selected', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectProviderConfig) return mockProviderConfig;
      });

      const alreadyAddedTokens = new Set<string>(['0x456']);
      const twoTokenResults = [
        {
          address: '0x123',
          symbol: 'TEST',
          name: 'Test Token',
          image: 'https://example.com/test.png',
          decimals: 18,
          chainId: '0x1' as const,
        },
        {
          address: '0x456',
          symbol: 'USDC',
          name: 'USD Coin',
          image: 'https://example.com/usdc.png',
          decimals: 6,
          chainId: '0x1' as const,
        },
      ];

      const { getAllByTestId } = render(
        <MultiAssetListItems
          searchResults={twoTokenResults}
          handleSelectAsset={() => ({})}
          selectedAsset={[twoTokenResults[0]]}
          searchQuery=""
          chainId="1"
          networkName="Ethereum"
          alreadyAddedTokens={alreadyAddedTokens}
        />,
      );

      const listItems = getAllByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      );

      expect(listItems[0]).toHaveProp('isSelected', true);
      expect(listItems[0]).toHaveProp('isDisabled', false);

      expect(listItems[1]).toHaveProp('isSelected', true);
      expect(listItems[1]).toHaveProp('isDisabled', true);
    });
  });
});
