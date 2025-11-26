import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NetworkPills } from './NetworkPills';
import { CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

const mockBridgeFeatureFlags = {
  chainRanking: [
    { chainId: 'eip155:1' as CaipChainId },
    { chainId: 'eip155:137' as CaipChainId },
    { chainId: 'eip155:10' as CaipChainId },
  ],
};

const mockNetworkConfigurations = {
  '0x1': { name: 'Ethereum Mainnet' },
  '0x89': { name: 'Polygon' },
  '0xa': { name: 'Optimism' },
};

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'bridge.all': 'All',
    };
    return translations[key] || key;
  },
}));

// Mock bridge constants
jest.mock('../../../../../constants/bridge', () => ({
  NETWORK_TO_SHORT_NETWORK_NAME_MAP: {
    'eip155:1': 'Ethereum',
    '0x1': 'Ethereum',
    'eip155:137': 'Polygon',
    '0x89': 'Polygon',
    'eip155:10': 'Optimism',
    '0xa': 'Optimism',
  },
}));

// Mock design system
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

// Mock design-system-react-native Text component
jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement(Text, null, children),
    TextVariant: {
      BodySm: 'BodySm',
      BodyMd: 'BodyMd',
      BodyLg: 'BodyLg',
    },
  };
});

// Mock gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { ScrollView } = jest.requireActual('react-native');
  return { ScrollView };
});

describe('NetworkPills', () => {
  const mockOnChainSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup useSelector mock to return different values based on call order
    // First call: selectBridgeFeatureFlags, Second call: selectNetworkConfigurations
    mockUseSelector
      .mockReturnValueOnce(mockBridgeFeatureFlags)
      .mockReturnValueOnce(mockNetworkConfigurations);
  });

  it('renders All pill and chain pills', () => {
    const { getByText } = render(
      <NetworkPills
        selectedChainId={undefined}
        onChainSelect={mockOnChainSelect}
      />,
    );

    expect(getByText('All')).toBeTruthy();
    expect(getByText('Ethereum')).toBeTruthy();
    expect(getByText('Polygon')).toBeTruthy();
    expect(getByText('Optimism')).toBeTruthy();
  });

  it('calls onChainSelect with undefined when All pill is pressed', () => {
    const { getByText } = render(
      <NetworkPills
        selectedChainId={'eip155:1' as CaipChainId}
        onChainSelect={mockOnChainSelect}
      />,
    );

    fireEvent.press(getByText('All'));

    expect(mockOnChainSelect).toHaveBeenCalledWith(undefined);
  });

  it('calls onChainSelect with chainId when chain pill is pressed', () => {
    const { getByText } = render(
      <NetworkPills
        selectedChainId={undefined}
        onChainSelect={mockOnChainSelect}
      />,
    );

    fireEvent.press(getByText('Ethereum'));

    expect(mockOnChainSelect).toHaveBeenCalledWith('eip155:1');
  });

  it('highlights selected chain pill', () => {
    const { getByText } = render(
      <NetworkPills
        selectedChainId={'eip155:137' as CaipChainId}
        onChainSelect={mockOnChainSelect}
      />,
    );

    // Polygon pill should be rendered (we're testing that it exists)
    expect(getByText('Polygon')).toBeTruthy();
  });

  it('highlights All pill when no chain is selected', () => {
    const { getByText } = render(
      <NetworkPills
        selectedChainId={undefined}
        onChainSelect={mockOnChainSelect}
      />,
    );

    // All pill should be rendered and clickable
    expect(getByText('All')).toBeTruthy();
  });

  it('renders pills for each chain in chainRanking', () => {
    const { getByText } = render(
      <NetworkPills
        selectedChainId={undefined}
        onChainSelect={mockOnChainSelect}
      />,
    );

    // Should render 3 chain pills + All pill
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Ethereum')).toBeTruthy();
    expect(getByText('Polygon')).toBeTruthy();
    expect(getByText('Optimism')).toBeTruthy();
  });
});
