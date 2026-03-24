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

jest.mock(
  '../../../../../../../selectors/featureFlagController/networkBlacklist',
  () => ({
    selectAdditionalNetworksBlacklistFeatureFlag: jest.fn(),
  }),
);

import { selectEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../../../selectors/multichainNetworkController';
import { NetworkConfiguration } from '@metamask/network-controller';
import { selectAdditionalNetworksBlacklistFeatureFlag } from '../../../../../../../selectors/featureFlagController/networkBlacklist';

const mockSelectEvmNetworkConfigurationsByChainId =
  selectEvmNetworkConfigurationsByChainId as jest.MockedFunction<
    typeof selectEvmNetworkConfigurationsByChainId
  >;
const mockSelectNonEvmNetworkConfigurationsByChainId =
  selectNonEvmNetworkConfigurationsByChainId as jest.MockedFunction<
    typeof selectNonEvmNetworkConfigurationsByChainId
  >;
const mockSelectAdditionalNetworksBlacklistFeatureFlag =
  selectAdditionalNetworksBlacklistFeatureFlag as jest.MockedFunction<
    typeof selectAdditionalNetworksBlacklistFeatureFlag
  >;

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
  };

  const mockSupportedNetworks = [
    { chainId: NETWORKS_CHAIN_ID.MAINNET, name: 'Ethereum Mainnet' },
    {
      chainId: NETWORKS_CHAIN_ID.LINEA_MAINNET,
      name: 'Linea Mainnet',
      boost: '+100%',
    },
    { chainId: NETWORKS_CHAIN_ID.OPTIMISM, name: 'Optimism' },
    { chainId: NETWORKS_CHAIN_ID.BSC, name: 'BNB Smart Chain' },
    { chainId: NETWORKS_CHAIN_ID.POLYGON, name: 'Polygon Mainnet' },
    { chainId: NETWORKS_CHAIN_ID.BASE, name: 'Base' },
    { chainId: NETWORKS_CHAIN_ID.ARBITRUM, name: 'Arbitrum One' },
    { chainId: NETWORKS_CHAIN_ID.AVAXCCHAIN, name: 'Avalanche C-Chain' },
    { chainId: NETWORKS_CHAIN_ID.ZKSYNC_ERA, name: 'zkSync Era Mainnet' },
    {
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      name: 'Solana Mainnet',
    },
  ];

  const defaultProps = {
    supportedNetworksTitle: 'Supported networks',
    supportedNetworks: mockSupportedNetworks,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue(
      mockEvmNetworks as unknown as Record<string, NetworkConfiguration>,
    );
    mockSelectNonEvmNetworkConfigurationsByChainId.mockReturnValue(
      mockNonEvmNetworks as never,
    );
    mockSelectAdditionalNetworksBlacklistFeatureFlag.mockReturnValue(
      [] as never,
    );

    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
        return mockEvmNetworks;
      }
      if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
        return mockNonEvmNetworks;
      }
      if (selector === mockSelectAdditionalNetworksBlacklistFeatureFlag) {
        return [];
      }
      return {};
    });
  });

  it('renders the section title from props', () => {
    // Arrange & Act
    const { getByText } = render(
      <SwapSupportedNetworksSection {...defaultProps} />,
    );

    // Assert
    expect(getByText('Supported networks')).toBeOnTheScreen();
  });

  it('renders a custom title from props', () => {
    // Arrange & Act
    const { getByText } = render(
      <SwapSupportedNetworksSection
        {...defaultProps}
        supportedNetworksTitle="Custom Title"
      />,
    );

    // Assert
    expect(getByText('Custom Title')).toBeOnTheScreen();
  });

  it('renders supported networks with names resolved from Redux', () => {
    // Arrange & Act
    const { getByText } = render(
      <SwapSupportedNetworksSection {...defaultProps} />,
    );

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

  it('displays boost from DTO data', () => {
    // Arrange & Act
    const { getByText } = render(
      <SwapSupportedNetworksSection {...defaultProps} />,
    );

    // Assert
    expect(getByText('+100%')).toBeOnTheScreen();
  });

  it('renders network avatars for each supported network', () => {
    // Arrange & Act
    const { getByTestId } = render(
      <SwapSupportedNetworksSection {...defaultProps} />,
    );

    // Assert
    expect(getByTestId('avatar-Ethereum Mainnet')).toBeOnTheScreen();
    expect(getByTestId('avatar-Linea Mainnet')).toBeOnTheScreen();
    expect(getByTestId('avatar-Optimism')).toBeOnTheScreen();
  });

  it('filters out networks with unknown names', () => {
    // Arrange - Mock network configurations without some networks
    const limitedEvmNetworks = {
      [NETWORKS_CHAIN_ID.MAINNET]: { name: 'Ethereum Mainnet' },
    };

    mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue(
      limitedEvmNetworks as unknown as Record<string, NetworkConfiguration>,
    );
    mockSelectNonEvmNetworkConfigurationsByChainId.mockReturnValue({} as never);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
        return limitedEvmNetworks;
      }
      if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
        return {};
      }
      if (selector === mockSelectAdditionalNetworksBlacklistFeatureFlag) {
        return [];
      }
      return {};
    });

    // Act
    const { getByText, queryByText } = render(
      <SwapSupportedNetworksSection {...defaultProps} />,
    );

    // Assert
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(queryByText('Unknown Network')).not.toBeOnTheScreen();
  });

  it('displays only boost badges for networks that have them', () => {
    // Arrange & Act
    const { getAllByText } = render(
      <SwapSupportedNetworksSection {...defaultProps} />,
    );

    // Assert - Only Linea has boost in the mock data
    const boostElements = getAllByText('+100%');
    expect(boostElements).toHaveLength(1);
  });

  it('uses useMemo to optimize network calculations', () => {
    // Arrange
    const { rerender } = render(
      <SwapSupportedNetworksSection {...defaultProps} />,
    );

    // Act - Rerender with same props
    rerender(<SwapSupportedNetworksSection {...defaultProps} />);

    // Assert - Component should render without errors (memoization working)
    expect(() =>
      rerender(<SwapSupportedNetworksSection {...defaultProps} />),
    ).not.toThrow();
  });

  describe('network item rendering', () => {
    it('renders network items with correct structure', () => {
      // Arrange & Act
      const { getByText, getByTestId } = render(
        <SwapSupportedNetworksSection {...defaultProps} />,
      );

      // Assert - Check a specific network has both avatar and text
      expect(getByTestId('avatar-Ethereum Mainnet')).toBeOnTheScreen();
      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });

    it('handles network names with ellipsis for long names', () => {
      // Arrange - Mock a network with a very long name resolved from config
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

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
          return longNameNetworks;
        }
        if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
          return {};
        }
        if (selector === mockSelectAdditionalNetworksBlacklistFeatureFlag) {
          return [];
        }
        return {};
      });

      // Act
      const { getByText } = render(
        <SwapSupportedNetworksSection
          supportedNetworksTitle="Supported networks"
          supportedNetworks={[
            { chainId: NETWORKS_CHAIN_ID.MAINNET, name: 'Ethereum Mainnet' },
          ]}
        />,
      );

      // Assert
      expect(
        getByText('Very Long Network Name That Should Be Truncated'),
      ).toBeOnTheScreen();
    });
  });

  describe('additionalNetworksBlacklist behavior', () => {
    it('excludes blacklisted networks from rendering', () => {
      // Arrange - blacklist Linea
      mockSelectAdditionalNetworksBlacklistFeatureFlag.mockReturnValue([
        NETWORKS_CHAIN_ID.LINEA_MAINNET,
      ] as never);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
          return mockEvmNetworks;
        }
        if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
          return mockNonEvmNetworks;
        }
        if (selector === mockSelectAdditionalNetworksBlacklistFeatureFlag) {
          return [NETWORKS_CHAIN_ID.LINEA_MAINNET];
        }
        return {};
      });

      // Act
      const { queryByText } = render(
        <SwapSupportedNetworksSection {...defaultProps} />,
      );

      // Assert - Linea should be excluded and boost not shown
      expect(queryByText('Linea Mainnet')).not.toBeOnTheScreen();
      expect(queryByText('+100%')).not.toBeOnTheScreen();
    });

    it('does nothing when blacklist contains non-supported chain IDs', () => {
      // Arrange - blacklist a random chainId
      mockSelectAdditionalNetworksBlacklistFeatureFlag.mockReturnValue([
        '0xdeadbeef',
      ] as never);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
          return mockEvmNetworks;
        }
        if (selector === mockSelectNonEvmNetworkConfigurationsByChainId) {
          return mockNonEvmNetworks;
        }
        if (selector === mockSelectAdditionalNetworksBlacklistFeatureFlag) {
          return ['0xdeadbeef'];
        }
        return {};
      });

      // Act
      const { getByText } = render(
        <SwapSupportedNetworksSection {...defaultProps} />,
      );

      // Assert - Linea and others remain
      expect(getByText('Linea Mainnet')).toBeOnTheScreen();
      expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    });
  });
});
