import React from 'react';
import { render } from '@testing-library/react-native';
import MultiAssetListItems from './MultiAssetListItems';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';

const mockProviderConfig = {
  type: 'mainnet',
};

const mockSearchResults = [
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    iconUrl: 'https://example.com/usdt.png',
  },
];

const mockSelectedAsset = [
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    iconUrl: 'https://example.com/usdt.png',
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
    ).toBeTruthy();
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

    expect(getByText('Tether USD')).toBeTruthy();
    expect(getByText('USDT')).toBeTruthy();
  });
});
