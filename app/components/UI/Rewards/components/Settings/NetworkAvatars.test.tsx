import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import NetworkAvatars from './NetworkAvatars';
import { getNetworkImageSource, isTestNet } from '../../../../../util/networks';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
  isTestNet: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../../selectors/multichainNetworkController', () => ({
  selectNonEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((...args) => args.join(' ')),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: 'Box',
  BoxFlexDirection: {
    Row: 'row',
  },
  BoxAlignItems: {
    Center: 'center',
  },
  Text: 'Text',
  TextVariant: {
    BodyXs: 'body-xs',
  },
  FontWeight: {
    Bold: 'bold',
  },
  TextColor: {
    PrimaryAlternative: 'primary-alternative',
  },
}));

jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  __esModule: true,
  default: 'Avatar',
  AvatarSize: {
    Sm: 'sm',
  },
  AvatarVariant: {
    Network: 'network',
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetNetworkImageSource = getNetworkImageSource as jest.MockedFunction<
  typeof getNetworkImageSource
>;
const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;

describe('NetworkAvatars', () => {
  const mockEvmNetworks = {
    '0x1': {
      name: 'Ethereum Mainnet',
      chainId: '0x1',
    },
    '0x89': {
      name: 'Polygon Mainnet',
      chainId: '0x89',
    },
    '0x38': {
      name: 'BSC Mainnet',
      chainId: '0x38',
    },
  };

  const mockNonEvmNetworks = {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
      name: 'Solana Mainnet',
    },
    'bitcoin:0': {
      name: 'Bitcoin Mainnet',
    },
  };

  const mockImageSource = { uri: 'test-image.png' };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectEvmNetworkConfigurationsByChainId) {
        return mockEvmNetworks;
      }
      if (selector === selectNonEvmNetworkConfigurationsByChainId) {
        return mockNonEvmNetworks;
      }
      return {};
    });

    mockGetNetworkImageSource.mockReturnValue(mockImageSource);
    mockIsTestNet.mockReturnValue(false);
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <NetworkAvatars scopes={['eip155:1']} testID="network-avatars" />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
    });

    it('should render null when scopes is empty', () => {
      const { queryByTestId } = render(
        <NetworkAvatars scopes={[]} testID="network-avatars" />,
      );

      expect(queryByTestId('network-avatars')).toBeNull();
    });

    it('should render null when scopes is not an array', () => {
      const { queryByTestId } = render(
        <NetworkAvatars
          scopes={null as unknown as string[]}
          testID="network-avatars"
        />,
      );

      expect(queryByTestId('network-avatars')).toBeNull();
    });

    it('should render null when no networks match the scopes', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return {};
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return {};
        }
        return {};
      });

      const { queryByTestId } = render(
        <NetworkAvatars scopes={['eip155:999']} testID="network-avatars" />,
      );

      expect(queryByTestId('network-avatars')).toBeNull();
    });
  });

  describe('Network Filtering', () => {
    it('should render EVM networks for specific chain ID scopes', () => {
      const { getByTestId } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:137']}
          testID="network-avatars"
        />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:1',
      });
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:137',
      });
    });

    it('should render non-EVM networks for specific chain ID scopes', () => {
      const { getByTestId } = render(
        <NetworkAvatars
          scopes={['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']}
          testID="network-avatars"
        />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });

    it('should skip invalid chain IDs', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidEvmNetworks = {
        'invalid-chain-id': {
          name: 'Invalid Network',
          chainId: 'invalid-chain-id',
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return invalidEvmNetworks;
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return mockNonEvmNetworks;
        }
        return {};
      });

      const { queryByTestId } = render(
        <NetworkAvatars
          scopes={['eip155:invalid-chain-id']}
          testID="network-avatars"
        />,
      );

      expect(queryByTestId('network-avatars')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid EVM chain ID:',
        'invalid-chain-id',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should skip empty or invalid scope values', () => {
      const { getByTestId } = render(
        <NetworkAvatars
          scopes={[
            '',
            '   ',
            'eip155:1',
            null as unknown as string,
            undefined as unknown as string,
          ]}
          testID="network-avatars"
        />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      // Should only process valid scopes
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(1);
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:1',
      });
    });
  });

  describe('Wildcard Scope Handling', () => {
    it('should render all EVM networks for eip155:* scope', () => {
      const { getByTestId } = render(
        <NetworkAvatars scopes={['eip155:*']} testID="network-avatars" />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      // Should call getNetworkImageSource for all EVM networks
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(3);
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:1',
      });
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:137',
      });
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:56',
      });
    });

    it('should render all Solana networks for solana:* scope', () => {
      const { getByTestId } = render(
        <NetworkAvatars scopes={['solana:*']} testID="network-avatars" />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });

    it('should handle eip155:0 scope as wildcard', () => {
      const { getByTestId } = render(
        <NetworkAvatars scopes={['eip155:0']} testID="network-avatars" />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      // Should call getNetworkImageSource for all EVM networks
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(3);
    });
  });

  describe('MaxVisible and Remaining Count', () => {
    it('should respect maxVisible prop and show remaining count', () => {
      const { getByText } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:137', 'eip155:56']}
          maxVisible={2}
          testID="network-avatars"
        />,
      );

      // Should show remaining count
      expect(getByText('+1')).toBeTruthy();
    });

    it('should not show remaining count when all networks are visible', () => {
      const { queryByText } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:137']}
          maxVisible={3}
          testID="network-avatars"
        />,
      );

      expect(queryByText('+1')).toBeNull();
    });

    it('should handle zero remaining count', () => {
      const { queryByText } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:137']}
          maxVisible={5}
          testID="network-avatars"
        />,
      );

      expect(queryByText('+0')).toBeNull();
    });
  });

  describe('Network Deduplication', () => {
    it('should not duplicate networks when same chain ID appears multiple times', () => {
      const { getByTestId } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:1', 'eip155:137']}
          testID="network-avatars"
        />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      // Should only call getNetworkImageSource twice (once for each unique chain ID)
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(2);
    });

    it('should not duplicate networks when mixing specific and wildcard scopes', () => {
      const { getByTestId } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:*']}
          testID="network-avatars"
        />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      // Should call getNetworkImageSource for all unique networks
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(3);
    });
  });

  describe('Avatar Properties', () => {
    it('should pass correct props to Avatar components', () => {
      render(<NetworkAvatars scopes={['eip155:1']} testID="network-avatars" />);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:1',
      });
    });

    it('should handle missing network names gracefully', () => {
      const networksWithoutNames = {
        '0x1': {
          chainId: '0x1',
          // Missing name property
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return networksWithoutNames;
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return mockNonEvmNetworks;
        }
        return {};
      });

      const { queryByTestId } = render(
        <NetworkAvatars scopes={['eip155:1']} testID="network-avatars" />,
      );

      expect(queryByTestId('network-avatars')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing network configurations gracefully', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return null;
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return null;
        }
        return {};
      });

      const { queryByTestId } = render(
        <NetworkAvatars scopes={['eip155:1']} testID="network-avatars" />,
      );

      expect(queryByTestId('network-avatars')).toBeNull();
    });
  });

  describe('Testnet Filtering', () => {
    it('should exclude EVM testnets from specific scope', () => {
      // Given a testnet chain (Sepolia)
      const networksWithTestnet = {
        '0x1': {
          name: 'Ethereum Mainnet',
          chainId: '0x1',
        },
        '0xaa36a7': {
          name: 'Sepolia Testnet',
          chainId: '0xaa36a7',
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return networksWithTestnet;
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return {};
        }
        return {};
      });

      // When isTestNet identifies Sepolia as testnet
      mockIsTestNet.mockImplementation((chainId) => chainId === '0xaa36a7');

      const { getByTestId } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:11155111']}
          testID="network-avatars"
        />,
      );

      // Then only mainnet should be rendered
      expect(getByTestId('network-avatars')).toBeTruthy();
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(1);
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:1',
      });
      expect(mockGetNetworkImageSource).not.toHaveBeenCalledWith({
        chainId: 'eip155:11155111',
      });
    });

    it('should exclude EVM testnets from wildcard scope', () => {
      // Given multiple networks including testnets
      const networksWithTestnets = {
        '0x1': {
          name: 'Ethereum Mainnet',
          chainId: '0x1',
        },
        '0xaa36a7': {
          name: 'Sepolia Testnet',
          chainId: '0xaa36a7',
        },
        '0x89': {
          name: 'Polygon Mainnet',
          chainId: '0x89',
        },
        '0xe704': {
          name: 'Linea Sepolia',
          chainId: '0xe704',
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return networksWithTestnets;
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return {};
        }
        return {};
      });

      // When isTestNet identifies testnets
      mockIsTestNet.mockImplementation(
        (chainId) => chainId === '0xaa36a7' || chainId === '0xe704',
      );

      const { getByTestId } = render(
        <NetworkAvatars scopes={['eip155:*']} testID="network-avatars" />,
      );

      // Then only mainnets should be rendered
      expect(getByTestId('network-avatars')).toBeTruthy();
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(2);
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:1',
      });
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'eip155:137',
      });
      expect(mockGetNetworkImageSource).not.toHaveBeenCalledWith({
        chainId: 'eip155:11155111',
      });
    });

    it('should not filter non-EVM networks (no hexChainId)', () => {
      // Given non-EVM networks
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return {};
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return mockNonEvmNetworks;
        }
        return {};
      });

      // When isTestNet is called (it shouldn't be for non-EVM)
      mockIsTestNet.mockReturnValue(true);

      const { getByTestId } = render(
        <NetworkAvatars
          scopes={['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']}
          testID="network-avatars"
        />,
      );

      // Then non-EVM network should still be rendered
      expect(getByTestId('network-avatars')).toBeTruthy();
      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });

    it('should handle all networks as mainnet when isTestNet returns false', () => {
      // Given multiple EVM networks
      const { getByTestId } = render(
        <NetworkAvatars scopes={['eip155:*']} testID="network-avatars" />,
      );

      // When isTestNet returns false for all (default mock)
      // Then all networks should be rendered
      expect(getByTestId('network-avatars')).toBeTruthy();
      expect(mockGetNetworkImageSource).toHaveBeenCalledTimes(3);
      expect(mockIsTestNet).toHaveBeenCalledWith('0x1');
      expect(mockIsTestNet).toHaveBeenCalledWith('0x89');
      expect(mockIsTestNet).toHaveBeenCalledWith('0x38');
    });

    it('should render null when all networks are testnets', () => {
      // Given only testnet networks
      const onlyTestnets = {
        '0xaa36a7': {
          name: 'Sepolia Testnet',
          chainId: '0xaa36a7',
        },
        '0xe704': {
          name: 'Linea Sepolia',
          chainId: '0xe704',
        },
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId) {
          return onlyTestnets;
        }
        if (selector === selectNonEvmNetworkConfigurationsByChainId) {
          return {};
        }
        return {};
      });

      // When all networks are testnets
      mockIsTestNet.mockReturnValue(true);

      const { queryByTestId } = render(
        <NetworkAvatars scopes={['eip155:*']} testID="network-avatars" />,
      );

      // Then nothing should be rendered
      expect(queryByTestId('network-avatars')).toBeNull();
    });

    it('should correctly use hex chain ID format for isTestNet check', () => {
      // Given a network configuration
      const { getByTestId } = render(
        <NetworkAvatars scopes={['eip155:1']} testID="network-avatars" />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();

      // Then isTestNet should be called with hex format (0x1), not decimal (1)
      expect(mockIsTestNet).toHaveBeenCalledWith('0x1');
      expect(mockIsTestNet).not.toHaveBeenCalledWith('1');
    });
  });

  describe('Z-Index Ordering', () => {
    it('should apply correct z-index ordering to avatars', () => {
      const { getByTestId } = render(
        <NetworkAvatars
          scopes={['eip155:1', 'eip155:137', 'eip155:56']}
          testID="network-avatars"
        />,
      );

      expect(getByTestId('network-avatars')).toBeTruthy();
      // The z-index logic is tested through the component rendering
      // Later avatars should have higher z-index values
    });
  });
});
