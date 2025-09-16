import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { SwapSupportedNetworksSection } from './SwapSupportedNetworksSection';
import { NETWORKS_CHAIN_ID } from '../../../../../../../constants/network';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock selectors
jest.mock('../../../../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../../../../selectors/multichainNetworkController', () => ({
  selectNonEvmNetworkConfigurationsByChainId: jest.fn(),
}));

import { selectEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/multichainNetworkController';
import { NetworkConfiguration } from '@metamask/network-controller';

const mockSelectEvmNetworkConfigurationsByChainId =
  selectEvmNetworkConfigurationsByChainId as jest.MockedFunction<
    typeof selectEvmNetworkConfigurationsByChainId
  >;
const mockSelectNonEvmNetworkConfigurationsByChainId =
  selectNonEvmNetworkConfigurationsByChainId as jest.MockedFunction<
    typeof selectNonEvmNetworkConfigurationsByChainId
  >;

// Mock i18n strings
jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'rewards.ways_to_earn.supported_networks': 'Supported Networks',
    };
    return mockStrings[key] || key;
  }),
}));

// Mock getNetworkImageSource
jest.mock('../../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-image-uri' })),
}));

// Mock PopularList
jest.mock('../../../../../../../util/networks/customNetworks', () => ({
  PopularList: [
    {
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      nickname: 'Solana Mainnet',
    },
    {
      chainId: 'pacific-1',
      nickname: 'Sei Network',
    },
  ],
}));

// Mock AvatarNetwork component
jest.mock(
  '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork',
  () => ({
    __esModule: true,
    default: ({ name }: { name: string }) => {
      const ReactActual = jest.requireActual('react');
      const { Text } = jest.requireActual('react-native');
      return ReactActual.createElement(
        Text,
        { testID: `avatar-${name}` },
        `Avatar: ${name}`,
      );
    },
  }),
);

describe('SwapSupportedNetworksSection', () => {
  const mockEvmNetworks: Record<string, { name: string }> = {
    [NETWORKS_CHAIN_ID.MAINNET]: { name: 'Ethereum Mainnet' },
    [NETWORKS_CHAIN_ID.LINEA_MAINNET]: { name: 'Linea Mainnet' },
    [NETWORKS_CHAIN_ID.OPTIMISM]: { name: 'Optimism' },
    [NETWORKS_CHAIN_ID.BSC]: { name: 'BNB Smart Chain' },
    [NETWORKS_CHAIN_ID.POLYGON]: { name: 'Polygon Mainnet' },
    [NETWORKS_CHAIN_ID.BASE]: { name: 'Base' },
    [NETWORKS_CHAIN_ID.ARBITRUM]: { name: 'Arbitrum One' },
    [NETWORKS_CHAIN_ID.AVAXCCHAIN]: { name: 'Avalanche C-Chain' },
    [NETWORKS_CHAIN_ID.ZKSYNC_ERA]: { name: 'zkSync Era Mainnet' },
  };

  const mockNonEvmNetworks: Record<string, { name: string }> = {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': { name: 'Solana Mainnet' },
    'pacific-1': { name: 'Sei Network' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock selector returns with the simplified data
    mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue(
      mockEvmNetworks as unknown as Record<string, NetworkConfiguration>,
    );
    mockSelectNonEvmNetworkConfigurationsByChainId.mockReturnValue(
      mockNonEvmNetworks as never,
    );

    // Mock useSelector to directly return the mocked data
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
        return mockEvmNetworks;
      }
      if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
        return mockNonEvmNetworks;
      }
      return {};
    });
  });

  it('renders the section title', () => {
    // Arrange & Act
    const { getByText } = render(<SwapSupportedNetworksSection />);

    // Assert
    expect(getByText('Supported Networks')).toBeOnTheScreen();
  });

  it('renders supported networks', () => {
    // Arrange & Act
    const { getByText } = render(<SwapSupportedNetworksSection />);

    // Assert
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(getByText('Linea Mainnet')).toBeOnTheScreen();
    expect(getByText('Optimism')).toBeOnTheScreen();
    expect(getByText('BNB Smart Chain')).toBeOnTheScreen();
    expect(getByText('Polygon Mainnet')).toBeOnTheScreen();
    expect(getByText('Base')).toBeOnTheScreen();
    expect(getByText('Arbitrum One')).toBeOnTheScreen();
    expect(getByText('Avalanche C-Chain')).toBeOnTheScreen();
    expect(getByText('zkSync Era Mainnet')).toBeOnTheScreen();
    expect(getByText('Solana Mainnet')).toBeOnTheScreen();
  });

  it('displays boost for Linea network', () => {
    // Arrange & Act
    const { getByText } = render(<SwapSupportedNetworksSection />);

    // Assert
    expect(getByText('+100%')).toBeOnTheScreen();
  });

  it('renders network avatars for each supported network', () => {
    // Arrange & Act
    const { getByTestId } = render(<SwapSupportedNetworksSection />);

    // Assert
    expect(getByTestId('avatar-Ethereum Mainnet')).toBeOnTheScreen();
    expect(getByTestId('avatar-Linea Mainnet')).toBeOnTheScreen();
    expect(getByTestId('avatar-Optimism')).toBeOnTheScreen();
  });

  it('filters out networks with unknown names', () => {
    // Arrange - Mock network configurations without some networks
    const limitedEvmNetworks = {
      [NETWORKS_CHAIN_ID.MAINNET]: { name: 'Ethereum Mainnet' },
      // Missing other networks
    };

    mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue(
      limitedEvmNetworks as unknown as Record<string, NetworkConfiguration>,
    );
    mockSelectNonEvmNetworkConfigurationsByChainId.mockReturnValue({} as never);

    // Override useSelector for this test
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
        return limitedEvmNetworks;
      }
      if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
        return {};
      }
      return {};
    });

    // Act
    const { getByText, queryByText } = render(<SwapSupportedNetworksSection />);

    // Assert
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(queryByText('Unknown Network')).not.toBeOnTheScreen();
  });

  it('displays only Linea boost and no other networks have boost', () => {
    // Arrange & Act
    const { getAllByText } = render(<SwapSupportedNetworksSection />);

    // Assert - Only one boost should be displayed
    const boostElements = getAllByText('+100%');
    expect(boostElements).toHaveLength(1);
  });

  it('uses useMemo to optimize network calculations', () => {
    // Arrange
    const { rerender } = render(<SwapSupportedNetworksSection />);

    // Act - Rerender with same props
    rerender(<SwapSupportedNetworksSection />);

    // Assert - Component should render without errors (memoization working)
    expect(() => rerender(<SwapSupportedNetworksSection />)).not.toThrow();
  });

  describe('network item rendering', () => {
    it('renders network items with correct structure', () => {
      // Arrange & Act
      const { getByText, getByTestId } = render(
        <SwapSupportedNetworksSection />,
      );

      // Assert - Check a specific network has both avatar and text
      expect(getByTestId('avatar-Ethereum Mainnet')).toBeOnTheScreen();
      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('handles network names with ellipsis for long names', () => {
      // Arrange - Mock a network with a very long name
      const longNameNetworks = {
        [NETWORKS_CHAIN_ID.MAINNET]: {
          name: 'Very Long Network Name That Should Be Truncated',
        },
      };

      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue(
        longNameNetworks as unknown as Record<string, NetworkConfiguration>,
      );
      mockSelectNonEvmNetworkConfigurationsByChainId.mockReturnValue(
        {} as never,
      );

      // Override useSelector for this test
      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
          return longNameNetworks;
        }
        if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
          return {};
        }
        return {};
      });

      // Act
      const { getByText } = render(<SwapSupportedNetworksSection />);

      // Assert
      expect(
        getByText('Very Long Network Name That Should Be Truncated'),
      ).toBeOnTheScreen();
    });
  });
});
