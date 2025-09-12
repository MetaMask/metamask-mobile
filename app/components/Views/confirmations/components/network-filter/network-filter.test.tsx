import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AssetType } from '../../types/token';
import { NetworkInfo, useNetworks } from '../../hooks/send/useNetworks';
import {
  NETWORK_FILTER_ALL,
  useNetworkFilter,
} from '../../hooks/send/useNetworkFilter';
import { NetworkFilter } from './network-filter';

const mockTokens: AssetType[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    balance: '1.5',
    balanceFiat: '$3000.00',
    image: 'https://example.com/eth.png',
    aggregators: [],
    logo: 'https://example.com/eth.png',
    isETH: true,
    isNative: true,
    ticker: 'ETH',
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    chainId: '0x89',
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    balance: '100.0',
    balanceFiat: '$50.00',
    image: 'https://example.com/matic.png',
    aggregators: [],
    logo: 'https://example.com/matic.png',
    isETH: false,
    isNative: true,
    ticker: 'MATIC',
  },
];

const mockNetworks: NetworkInfo[] = [
  {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    image: { uri: 'https://example.com/eth.png' },
  },
  {
    chainId: '0x89',
    name: 'Polygon',
    image: { uri: 'https://example.com/polygon.png' },
  },
];

const mockSetSelectedNetworkFilter = jest.fn();
const mockOnFilteredTokensChange = jest.fn();
const mockOnNetworkFilterStateChange = jest.fn();
const mockOnExposeFilterControls = jest.fn();
const mockOnNetworkFilterChange = jest.fn();

jest.mock('../../hooks/send/useNetworks', () => ({
  useNetworks: jest.fn(),
}));

jest.mock('../../hooks/send/useNetworkFilter', () => ({
  useNetworkFilter: jest.fn(),
  NETWORK_FILTER_ALL: 'all',
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const strings: Record<string, string> = {
      'send.all_networks': 'All networks',
    };
    return strings[key] || key;
  }),
}));

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID={`avatar-${name}`} />;
  },
  AvatarSize: { Xs: 'xs' },
  AvatarVariant: { Network: 'network' },
}));

describe('NetworkFilter', () => {
  const mockUseNetworks = jest.mocked(useNetworks);
  const mockUseNetworkFilter = jest.mocked(useNetworkFilter);
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworks.mockReturnValue(mockNetworks);
    mockUseNetworkFilter.mockReturnValue({
      selectedNetworkFilter: NETWORK_FILTER_ALL,
      setSelectedNetworkFilter: mockSetSelectedNetworkFilter,
      filteredTokensByNetwork: mockTokens,
      networksWithTokens: mockNetworks,
    });
  });

  it('renders network filter tabs when multiple networks have tokens', () => {
    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
      />,
    );

    expect(screen.getByText('All networks')).toBeOnTheScreen();
    expect(screen.getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(screen.getByText('Polygon')).toBeOnTheScreen();
  });

  it('does not render when only one network has tokens', () => {
    mockUseNetworkFilter.mockReturnValue({
      selectedNetworkFilter: NETWORK_FILTER_ALL,
      setSelectedNetworkFilter: mockSetSelectedNetworkFilter,
      filteredTokensByNetwork: mockTokens,
      networksWithTokens: [mockNetworks[0]],
    });

    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
      />,
    );

    expect(screen.queryByText('All networks')).not.toBeOnTheScreen();
  });

  it('calls setSelectedNetworkFilter when All networks tab is pressed', () => {
    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
      />,
    );

    fireEvent.press(screen.getByText('All networks'));
    expect(mockSetSelectedNetworkFilter).toHaveBeenCalledWith(
      NETWORK_FILTER_ALL,
    );
  });

  it('calls setSelectedNetworkFilter when network tab is pressed', () => {
    const { rerender } = render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
        onNetworkFilterChange={mockOnNetworkFilterChange}
      />,
    );

    jest.clearAllMocks();

    mockUseNetworkFilter.mockReturnValue({
      selectedNetworkFilter: '0x1',
      setSelectedNetworkFilter: mockSetSelectedNetworkFilter,
      filteredTokensByNetwork: [mockTokens[0]],
      networksWithTokens: mockNetworks,
    });

    rerender(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
        onNetworkFilterChange={mockOnNetworkFilterChange}
      />,
    );

    expect(mockOnNetworkFilterChange).toHaveBeenCalledWith('0x1');
  });

  it('calls onFilteredTokensChange when filtered tokens change', () => {
    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
      />,
    );

    expect(mockOnFilteredTokensChange).toHaveBeenCalledWith(mockTokens);
  });

  it('calls onNetworkFilterStateChange when filter state changes', () => {
    mockUseNetworkFilter.mockReturnValue({
      selectedNetworkFilter: '0x1',
      setSelectedNetworkFilter: mockSetSelectedNetworkFilter,
      filteredTokensByNetwork: [mockTokens[0]],
      networksWithTokens: mockNetworks,
    });

    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
        onNetworkFilterStateChange={mockOnNetworkFilterStateChange}
      />,
    );

    expect(mockOnNetworkFilterStateChange).toHaveBeenCalledWith(true);
  });

  it('exposes clear filters function through onExposeFilterControls', () => {
    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
        onExposeFilterControls={mockOnExposeFilterControls}
      />,
    );

    expect(mockOnExposeFilterControls).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('renders network avatars for individual network tabs', () => {
    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
      />,
    );

    expect(screen.getByTestId('avatar-Ethereum Mainnet')).toBeOnTheScreen();
    expect(screen.getByTestId('avatar-Polygon')).toBeOnTheScreen();
  });

  it('does not render avatar for All networks tab', () => {
    render(
      <NetworkFilter
        tokens={mockTokens}
        onFilteredTokensChange={mockOnFilteredTokensChange}
        onNetworkFilterChange={mockOnNetworkFilterChange}
      />,
    );

    expect(screen.queryByTestId('avatar-All networks')).not.toBeOnTheScreen();
  });
});
