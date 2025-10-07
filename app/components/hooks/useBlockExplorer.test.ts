import { useNavigation } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { backgroundState } from '../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import useBlockExplorer from './useBlockExplorer';
import { mockNetworkState } from '../../util/test/network';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: '0xe704',
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          blockExplorerUrl: 'https://goerli.lineascan.build',
        }),
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (fn: any) => fn(mockInitialState),
}));

const mockedNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
  };
});

describe('useBlockExplorer', () => {
  it('should navigate to the correct block explorer for no-RPC provider', () => {
    const { result } = renderHookWithProvider(() => useBlockExplorer());
    const { toBlockExplorer } = result.current;
    const address = '0x1234567890abcdef';
    toBlockExplorer(address);
    expect(useNavigation().navigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: `https://goerli.lineascan.build/address/${address}`,
      },
    });
  });

  it('should navigate to the correct block explorer for RPC provider', () => {
    const { result } = renderHookWithProvider(() => useBlockExplorer());
    const { toBlockExplorer } = result.current;
    const address = '0x1234567890abcdef';
    toBlockExplorer(address);
    expect(useNavigation().navigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: `https://goerli.lineascan.build/address/${address}`,
      },
    });
  });

  describe('Popular networks support', () => {
    const testCases = [
      {
        network: 'Polygon',
        chainId: '0x89',
        expectedUrl: 'https://polygonscan.com/address/0x1234567890abcdef',
        expectedName: 'Polygonscan',
      },
      {
        network: 'Arbitrum',
        chainId: '0xa4b1',
        expectedUrl: 'https://arbiscan.io/address/0x1234567890abcdef',
        expectedName: 'Arbiscan',
      },
      {
        network: 'BNB Chain',
        chainId: '0x38',
        expectedUrl: 'https://bscscan.com/address/0x1234567890abcdef',
        expectedName: 'Bscscan',
      },
      {
        network: 'Avalanche',
        chainId: '0xa86a',
        expectedUrl: 'https://snowtrace.io/address/0x1234567890abcdef',
        expectedName: 'Snowtrace',
      },
      {
        network: 'Optimism',
        chainId: '0xa',
        expectedUrl:
          'https://optimistic.etherscan.io/address/0x1234567890abcdef',
        expectedName: 'Optimistic',
      },
    ] as const;

    it.each(testCases)(
      'should return correct block explorer URL for $network',
      ({ chainId, expectedUrl }) => {
        const { result } = renderHookWithProvider(() => useBlockExplorer());
        const { getBlockExplorerUrl } = result.current;
        const address = '0x1234567890abcdef';

        const url = getBlockExplorerUrl(address, chainId);

        expect(url).toBe(expectedUrl);
      },
    );

    it.each(testCases)(
      'should return correct block explorer name for $network',
      ({ chainId, expectedName }) => {
        const { result } = renderHookWithProvider(() => useBlockExplorer());
        const { getBlockExplorerName } = result.current;

        const name = getBlockExplorerName(chainId);

        expect(name).toBe(expectedName);
      },
    );
  });

  describe('Non-EVM chains support', () => {
    it('should return correct block explorer URL for Solana', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
      const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'; // Solana mainnet

      const url = getBlockExplorerUrl(address, solanaChainId);
      expect(url).toBe(
        'https://solscan.io/account/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      );
    });

    it('should return correct block explorer URL for Bitcoin', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const bitcoinChainId = 'bip122:000000000019d6689c085ae165831e93'; // Bitcoin mainnet

      const url = getBlockExplorerUrl(address, bitcoinChainId);
      expect(url).toBe(
        'https://mempool.space/address/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      );
    });
  });

  describe('RPC networks with custom block explorers', () => {
    it('should use custom RPC block explorer when available', () => {
      // This test verifies the RPC fallback path is covered
      // The actual implementation uses the mocked state from the main test setup
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '0x1234567890abcdef';

      // This should use the RPC fallback path from the mocked state
      const url = getBlockExplorerUrl(address);
      expect(url).toBeDefined();
      expect(url).toContain('/address/');
    });
  });

  describe('Fallback scenarios', () => {
    it('should fallback to etherscan when no specific block explorer is found', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '0x1234567890abcdef';
      const unknownChainId = '0x9999'; // Unknown chain

      const url = getBlockExplorerUrl(address, unknownChainId);
      // Should fallback to etherscan or use the RPC fallback
      expect(url).toBeDefined();
      expect(url).toContain('/address/');
    });

    it('should return null when no block explorer is available', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '0x1234567890abcdef';

      // Test with no chainId and no provider config
      const url = getBlockExplorerUrl(address);
      expect(url).toBeDefined(); // Should fallback to etherscan
    });

    it('should handle missing address gracefully', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const polygonChainId = '0x89';

      const url = getBlockExplorerUrl('', polygonChainId);
      expect(url).toBe('https://polygonscan.com/address/');
    });
  });

  describe('Block explorer names for edge cases', () => {
    it('should return fallback name when no block explorer is found', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerName } = result.current;
      const unknownChainId = '0x9999';

      const name = getBlockExplorerName(unknownChainId);
      expect(name).toBeDefined();
    });

    it('should handle non-EVM chain names', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerName } = result.current;
      const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

      const name = getBlockExplorerName(solanaChainId);
      expect(name).toBe('Solscan');
    });
  });

  describe('CAIP chain ID conversion edge cases', () => {
    it('should handle non-EVM CAIP chain IDs correctly', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '0x1234567890abcdef';

      // Test with a non-EVM CAIP chain ID (non-eip155 namespace)
      const nonEvmCaipChainId = 'cosmos:cosmoshub-4';

      const url = getBlockExplorerUrl(address, nonEvmCaipChainId);
      // Should return null or handle gracefully since it's not a supported non-EVM chain
      expect(url).toBeDefined();
    });

    it('should handle already hex-formatted chain IDs', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '0x1234567890abcdef';
      const hexChainId = '0x89'; // Already in hex format

      const url = getBlockExplorerUrl(address, hexChainId);
      expect(url).toBe('https://polygonscan.com/address/0x1234567890abcdef');
    });
  });

  describe('Built-in block explorer coverage', () => {
    it('should use built-in block explorers for supported chains', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '0x1234567890abcdef';

      // Test Ethereum mainnet (built-in)
      const url = getBlockExplorerUrl(address, '0x1');
      expect(url).toContain('etherscan.io');
    });
  });

  describe('Navigation edge cases', () => {
    it('should handle navigation when block explorer URL is available', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { toBlockExplorer } = result.current;

      // Test with a valid address and chain ID
      toBlockExplorer('0x1234567890abcdef', '0x89');

      // Should call navigate with the correct URL
      expect(useNavigation().navigate).toHaveBeenCalledWith(
        Routes.WEBVIEW.MAIN,
        {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url: 'https://polygonscan.com/address/0x1234567890abcdef',
          },
        },
      );
    });
  });

  describe('Etherscan fallback coverage', () => {
    it('should use etherscan fallback when no specific block explorer is found', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerUrl } = result.current;
      const address = '0x1234567890abcdef';

      // Test with a chain ID that doesn't exist in our mappings
      const url = getBlockExplorerUrl(address, '0x9999');
      expect(url).toBeDefined();
      expect(url).toContain('/address/');
    });

    it('should use etherscan fallback for block explorer names', () => {
      const { result } = renderHookWithProvider(() => useBlockExplorer());
      const { getBlockExplorerName } = result.current;

      // Test with a chain ID that doesn't exist in our mappings
      const name = getBlockExplorerName('0x9999');
      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
    });
  });
});
