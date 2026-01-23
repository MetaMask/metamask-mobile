import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NetworkPills } from './NetworkPills';
import { CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { MOCK_CHAIN_IDS } from '../../testUtils/fixtures';
import { TokenSelectorType } from '../../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

// Mock chain ranking array with names from feature flags
const mockChainRanking = [
  { chainId: MOCK_CHAIN_IDS.ethereum, name: 'Ethereum' },
  { chainId: MOCK_CHAIN_IDS.polygon, name: 'Polygon' },
  { chainId: MOCK_CHAIN_IDS.optimism, name: 'Optimism' },
];

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => (key === 'bridge.all' ? 'All' : key),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement(Text, null, children),
    TextVariant: { BodySm: 'BodySm', BodyMd: 'BodyMd' },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { ScrollView } = jest.requireActual('react-native');
  return { ScrollView };
});

describe('NetworkPills', () => {
  const mockOnChainSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockChainRanking);
  });

  describe('rendering', () => {
    it('renders All pill and chain pills in source mode', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          type={TokenSelectorType.Source}
        />,
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Ethereum')).toBeTruthy();
      expect(getByText('Polygon')).toBeTruthy();
      expect(getByText('Optimism')).toBeTruthy();
    });

    it('renders pills for each chain in chainRanking in dest mode', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={undefined}
          onChainSelect={mockOnChainSelect}
          type={TokenSelectorType.Dest}
        />,
      );

      // Should render 3 chain pills + All pill
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Ethereum')).toBeTruthy();
      expect(getByText('Polygon')).toBeTruthy();
      expect(getByText('Optimism')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onChainSelect with undefined when All pill is pressed', () => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={MOCK_CHAIN_IDS.ethereum}
          onChainSelect={mockOnChainSelect}
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
          type={TokenSelectorType.Source}
        />,
      );

      fireEvent.press(getByText('Ethereum'));

      expect(mockOnChainSelect).toHaveBeenCalledWith(MOCK_CHAIN_IDS.ethereum);
    });
  });

  describe('selection state', () => {
    it.each([
      ['Polygon pill when selected', MOCK_CHAIN_IDS.polygon, 'Polygon'],
      ['All pill when no chain selected', undefined, 'All'],
    ])('highlights %s', (_, selectedChainId, expectedText) => {
      const { getByText } = render(
        <NetworkPills
          selectedChainId={selectedChainId as CaipChainId | undefined}
          onChainSelect={mockOnChainSelect}
          type={TokenSelectorType.Source}
        />,
      );

      expect(getByText(expectedText)).toBeTruthy();
    });
  });
});
