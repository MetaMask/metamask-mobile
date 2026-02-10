import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NetworkPills } from './NetworkPills';
import { CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { TokenSelectorType } from '../../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

// Mock chain ranking array with names from feature flags
const mockChainRanking = [
  { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { chainId: 'eip155:56' as CaipChainId, name: 'BNB Chain' },
  {
    chainId: 'bip122:000000000019d6689c085ae165831e93' as CaipChainId,
    name: 'Bitcoin',
  },
  {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId,
    name: 'Solana',
  },
  { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
  { chainId: 'eip155:10' as CaipChainId, name: 'Optimism' },
  { chainId: 'eip155:42161' as CaipChainId, name: 'Arbitrum' },
];

// Small chain ranking with fewer than MAX_VISIBLE_PILLS networks
const mockSmallChainRanking = [
  { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
  { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
];

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { count?: number }) => {
    if (key === 'bridge.all') return 'All';
    if (key === 'bridge.more_networks') return `+${params?.count} more`;
    return key;
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-network-icon' })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    AvatarBaseShape: { Circle: 'circle', Square: 'square' },
    AvatarNetwork: ({
      name,
      testID,
    }: {
      name?: string;
      testID?: string;
      src?: unknown;
      size?: string;
      shape?: string;
    }) => createElement(View, { testID: testID ?? `avatar-network-${name}` }),
    AvatarNetworkSize: { Xs: '16', Sm: '24', Md: '32' },
    Box: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => createElement(View, props, children),
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
    FontWeight: { Medium: '500' },
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement(Text, null, children),
    TextColor: {
      PrimaryInverse: 'text-primary-inverse',
      TextDefault: 'text-default',
    },
    TextVariant: { BodySm: 'BodySm', BodyMd: 'BodyMd' },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { ScrollView } = jest.requireActual('react-native');
  return { ScrollView };
});

describe('NetworkPills', () => {
  const mockOnChainSelect = jest.fn();
  const mockOnMorePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockChainRanking);
  });

  describe('rendering', () => {
    it('renders All pill and first MAX_VISIBLE_PILLS chain pills', () => {
      const { getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      expect(getByText('All')).toBeTruthy();
      // First 4 from chainRanking: Ethereum, BNB Chain, Bitcoin, Solana
      expect(getByText('Ethereum')).toBeTruthy();
      expect(getByText('BNB Chain')).toBeTruthy();
      expect(getByText('Bitcoin')).toBeTruthy();
      expect(getByText('Solana')).toBeTruthy();
      // Remaining chains should not be rendered as pills
      expect(queryByText('Polygon')).toBeNull();
      expect(queryByText('Optimism')).toBeNull();
      expect(queryByText('Arbitrum')).toBeNull();
    });

    it('renders network icons for each visible chain pill', () => {
      const { getByTestId, queryByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      expect(getByTestId('avatar-network-Ethereum')).toBeTruthy();
      expect(getByTestId('avatar-network-BNB Chain')).toBeTruthy();
      expect(getByTestId('avatar-network-Bitcoin')).toBeTruthy();
      expect(getByTestId('avatar-network-Solana')).toBeTruthy();
      expect(queryByTestId('avatar-network-Polygon')).toBeNull();
    });

    it('renders "+X more" pill with correct count', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      // 7 total - 4 visible = 3 remaining
      expect(getByText('+3 more')).toBeTruthy();
    });

    it('does not render "+X more" when all networks are visible', () => {
      mockUseSelector.mockReturnValue(mockSmallChainRanking);

      const { queryByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      expect(queryByTestId('network-pills-more-button')).toBeNull();
    });

    it('shows first MAX_VISIBLE_PILLS from any chainRanking order', () => {
      const customRanking = [
        { chainId: 'eip155:137' as CaipChainId, name: 'Polygon' },
        { chainId: 'eip155:10' as CaipChainId, name: 'Optimism' },
        { chainId: 'eip155:42161' as CaipChainId, name: 'Arbitrum' },
        { chainId: 'eip155:1' as CaipChainId, name: 'Ethereum' },
        { chainId: 'eip155:56' as CaipChainId, name: 'BNB Chain' },
      ];
      mockUseSelector.mockReturnValue(customRanking);

      const { getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      // First 4 from the custom ranking
      expect(getByText('Polygon')).toBeTruthy();
      expect(getByText('Optimism')).toBeTruthy();
      expect(getByText('Arbitrum')).toBeTruthy();
      expect(getByText('Ethereum')).toBeTruthy();
      // 5th entry should not be visible
      expect(queryByText('BNB Chain')).toBeNull();
    });

    it('renders network icons for each chain pill', () => {
      const { getByTestId } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          type={TokenSelectorType.Source}
        />,
      );

      expect(getByTestId('avatar-network-Ethereum')).toBeTruthy();
      expect(getByTestId('avatar-network-Polygon')).toBeTruthy();
      expect(getByTestId('avatar-network-Optimism')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onChainSelect with undefined when All pill is pressed', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={'eip155:1' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
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
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      fireEvent.press(getByText('Ethereum'));

      expect(mockOnChainSelect).toHaveBeenCalledWith('eip155:1');
    });

    it('calls onMorePress when "+X more" pill is pressed', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      fireEvent.press(getByText('+3 more'));

      expect(mockOnMorePress).toHaveBeenCalled();
    });
  });

  describe('selection state', () => {
    it('highlights selected chain pill', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={'eip155:56' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      expect(getByText('BNB Chain')).toBeTruthy();
    });

    it('highlights All pill when no chain selected', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      expect(getByText('All')).toBeTruthy();
    });
  });

  describe('visible pills update on selection', () => {
    it('adds non-visible chain to front of visible list when selected', () => {
      const { rerender, getByText, queryByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      // Initially Polygon is not visible
      expect(queryByText('Polygon')).toBeNull();

      // Select Polygon (non-visible chain) by passing it as selectedChainId
      rerender(
        <NetworkPills
          selectedChainId={'eip155:137' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      // Now Polygon should be visible (pushed to front, Solana popped)
      expect(getByText('Polygon')).toBeTruthy();
      expect(queryByText('Solana')).toBeNull();
    });

    it('does not change visible list when selecting an already visible chain', () => {
      const { rerender, getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      // Select Ethereum (already visible)
      rerender(
        <NetworkPills
          selectedChainId={'eip155:1' as CaipChainId}
          onChainSelect={mockOnChainSelect}
          onMorePress={mockOnMorePress}
          type={TokenSelectorType.Source}
        />,
      );

      // All original 4 should still be visible
      expect(getByText('Ethereum')).toBeTruthy();
      expect(getByText('BNB Chain')).toBeTruthy();
      expect(getByText('Bitcoin')).toBeTruthy();
      expect(getByText('Solana')).toBeTruthy();
    });
  });
});
