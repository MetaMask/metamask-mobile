import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useMultichainBlockExplorerTxUrl } from '.';
import { waitFor } from '@testing-library/react-native';
import { ChainId } from '@metamask/bridge-controller';
import { getTransactionUrl } from '../../../../../core/Multichain/utils';
import {
  getBlockExplorerName,
  getNetworkImageSource,
} from '../../../../../util/networks';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';
import useBlockExplorer from '../../../../hooks/useBlockExplorer';
import etherscanLink from '@metamask/etherscan-link';

// Mock all external dependencies
jest.mock('../../../../../core/Multichain/utils');
jest.mock('../../../../../util/networks');
jest.mock('../../../../../util/etherscan');
jest.mock('../../../../hooks/useBlockExplorer');
jest.mock('@metamask/etherscan-link');

const mockGetTransactionUrl = getTransactionUrl as jest.MockedFunction<
  typeof getTransactionUrl
>;
const mockGetBlockExplorerName = getBlockExplorerName as jest.MockedFunction<
  typeof getBlockExplorerName
>;
const mockGetNetworkImageSource = getNetworkImageSource as jest.MockedFunction<
  typeof getNetworkImageSource
>;
const mockGetEtherscanBaseUrl = getEtherscanBaseUrl as jest.MockedFunction<
  typeof getEtherscanBaseUrl
>;
const mockUseBlockExplorer = useBlockExplorer as jest.MockedFunction<
  typeof useBlockExplorer
>;
const mockCreateCustomExplorerLink =
  etherscanLink.createCustomExplorerLink as jest.MockedFunction<
    typeof etherscanLink.createCustomExplorerLink
  >;

describe('useMultichainBlockExplorerTxUrl', () => {
  const mockBlockExplorerHook = {
    getEvmBlockExplorerUrl: jest.fn(),
    getBlockExplorerName: jest.fn(),
    getBlockExplorerUrl: jest.fn(),
    toBlockExplorer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseBlockExplorer.mockReturnValue(mockBlockExplorerHook);
    mockGetNetworkImageSource.mockReturnValue(1);
    mockGetEtherscanBaseUrl.mockReturnValue('https://etherscan.io');
    mockCreateCustomExplorerLink.mockImplementation(
      (hash, baseUrl) => `${baseUrl}/tx/${hash}`,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('parameter validation', () => {
    it('returns undefined when chainId is missing', () => {
      const { result } = renderHookWithProvider(
        () => useMultichainBlockExplorerTxUrl({ txHash: '0x123' }),
        { state: initialState },
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when txHash is missing', () => {
      const { result } = renderHookWithProvider(
        () => useMultichainBlockExplorerTxUrl({ chainId: 1 }),
        { state: initialState },
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when both chainId and txHash are missing', () => {
      const { result } = renderHookWithProvider(
        () => useMultichainBlockExplorerTxUrl({}),
        { state: initialState },
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('EVM chains', () => {
    it('returns EVM block explorer URL for Ethereum mainnet', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://etherscan.io',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('Etherscan');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 1,
            txHash: '0x123456789abcdef',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          explorerTxUrl: 'https://etherscan.io/tx/0x123456789abcdef',
          explorerName: 'Etherscan',
          networkImageSource: 1,
          chainName: 'Ethereum Mainnet',
        });
      });

      expect(mockBlockExplorerHook.getEvmBlockExplorerUrl).toHaveBeenCalledWith(
        '0x1',
      );
      expect(mockCreateCustomExplorerLink).toHaveBeenCalledWith(
        '0x123456789abcdef',
        'https://etherscan.io',
      );
    });

    it('returns EVM block explorer URL for Optimism', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://optimistic.etherscan.io',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue(
        'Optimism Explorer',
      );

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 10,
            txHash: '0xabc123',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          explorerTxUrl: 'https://optimistic.etherscan.io/tx/0xabc123',
          explorerName: 'Optimism Explorer',
          networkImageSource: 1,
          chainName: 'Optimism',
        });
      });

      expect(mockBlockExplorerHook.getEvmBlockExplorerUrl).toHaveBeenCalledWith(
        '0xa',
      );
    });

    it('falls back to etherscan base URL when getEvmBlockExplorerUrl returns null', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(null);
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('Etherscan');
      mockGetEtherscanBaseUrl.mockReturnValue('https://etherscan.io');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 1,
            txHash: '0xfallback123',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.explorerTxUrl).toBe(
          'https://etherscan.io/tx/0xfallback123',
        );
      });

      expect(mockGetEtherscanBaseUrl).toHaveBeenCalledWith('mainnet');
      expect(mockCreateCustomExplorerLink).toHaveBeenCalledWith(
        '0xfallback123',
        'https://etherscan.io',
      );
    });

    it('uses provider config from evmNetworkConfig when available', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://etherscan.io',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('Etherscan');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 1,
            txHash: '0x999',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.chainName).toBe('Ethereum Mainnet');
      });
    });

    it('returns chainName from evmNetworkConfig when available', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://etherscan.io',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('Etherscan');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 10,
            txHash: '0xtest',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.chainName).toBe('Optimism');
      });
    });

    it('returns undefined chainName when evmNetworkConfig is not available', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://example.io',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('Explorer');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 999, // Unknown chain
            txHash: '0xunknown',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.chainName).toBeUndefined();
      });
    });
  });

  describe('non-EVM chains', () => {
    it('returns Solana block explorer URL for Solana chain', async () => {
      mockGetTransactionUrl.mockReturnValue(
        'https://solscan.io/tx/solana-tx-hash',
      );
      mockGetBlockExplorerName.mockReturnValue('Solscan');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: ChainId.SOLANA,
            txHash: 'solana-tx-hash',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current).toEqual({
          explorerTxUrl: 'https://solscan.io/tx/solana-tx-hash',
          explorerName: 'Solscan',
          networkImageSource: 1,
          chainName: 'Solana',
        });
      });

      expect(mockGetTransactionUrl).toHaveBeenCalledWith(
        'solana-tx-hash',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      expect(mockGetBlockExplorerName).toHaveBeenCalledWith(
        'https://solscan.io/tx/solana-tx-hash',
      );
    });

    it('uses blockExplorer.getBlockExplorerName for non-EVM chain when explorerTxUrl is empty', async () => {
      mockGetTransactionUrl.mockReturnValue('');
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue(
        'Default Explorer',
      );

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: ChainId.SOLANA,
            txHash: 'solana-tx-no-url',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.explorerName).toBe('Default Explorer');
      });

      expect(mockBlockExplorerHook.getBlockExplorerName).toHaveBeenCalled();
    });

    it('returns chainName from nonEvmNetworkConfigurations for Solana', async () => {
      mockGetTransactionUrl.mockReturnValue('https://solscan.io/tx/solana-tx');
      mockGetBlockExplorerName.mockReturnValue('Solscan');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: ChainId.SOLANA,
            txHash: 'solana-tx',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.chainName).toBe('Solana');
      });
    });

    it('returns undefined chainName when nonEvmNetworkConfiguration is not available', async () => {
      mockGetTransactionUrl.mockReturnValue('https://explorer.io/tx/unknown');
      mockGetBlockExplorerName.mockReturnValue('Explorer');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 999999999, // Unknown non-EVM chain
            txHash: 'unknown-tx',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.chainName).toBeUndefined();
      });
    });
  });

  describe('network image source', () => {
    it('calls getNetworkImageSource with formatted chainId for EVM chains', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://etherscan.io',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('Etherscan');
      mockGetNetworkImageSource.mockReturnValue(42);

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 1,
            txHash: '0xtest',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.networkImageSource).toBe(42);
      });

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: '0x1',
      });
    });

    it('calls getNetworkImageSource with formatted chainId for non-EVM chains', async () => {
      mockGetTransactionUrl.mockReturnValue('https://solscan.io/tx/solana-tx');
      mockGetBlockExplorerName.mockReturnValue('Solscan');
      mockGetNetworkImageSource.mockReturnValue(99);

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: ChainId.SOLANA,
            txHash: 'solana-tx',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.networkImageSource).toBe(99);
      });

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });
  });

  describe('explorer name determination', () => {
    it('uses getBlockExplorerName from URL for non-EVM chains with explorerTxUrl', async () => {
      mockGetTransactionUrl.mockReturnValue(
        'https://custom-solana-explorer.io/tx/hash123',
      );
      mockGetBlockExplorerName.mockReturnValue('Custom Solana Explorer');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: ChainId.SOLANA,
            txHash: 'hash123',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.explorerName).toBe('Custom Solana Explorer');
      });

      expect(mockGetBlockExplorerName).toHaveBeenCalledWith(
        'https://custom-solana-explorer.io/tx/hash123',
      );
    });

    it('uses blockExplorer.getBlockExplorerName for EVM chains', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://polygonscan.com',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('PolygonScan');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 137,
            txHash: '0xpolygon',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.explorerName).toBe('PolygonScan');
      });

      expect(mockBlockExplorerHook.getBlockExplorerName).toHaveBeenCalledWith(
        'eip155:137',
      );
    });
  });

  describe('edge cases', () => {
    it('handles etherscanLink returning custom explorer link correctly', async () => {
      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://custom.explorer',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue(
        'Custom Explorer',
      );
      mockCreateCustomExplorerLink.mockReturnValue(
        'https://custom.explorer/transaction/0xcustom',
      );

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 1,
            txHash: '0xcustom',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.explorerTxUrl).toBe(
          'https://custom.explorer/transaction/0xcustom',
        );
      });

      expect(mockCreateCustomExplorerLink).toHaveBeenCalledWith(
        '0xcustom',
        'https://custom.explorer',
      );
    });

    it('handles getTransactionUrl returning empty string for non-EVM chains', async () => {
      mockGetTransactionUrl.mockReturnValue('');
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('Explorer');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: ChainId.SOLANA,
            txHash: 'missing-tx',
          }),
        { state: initialState },
      );

      await waitFor(() => {
        expect(result.current?.explorerTxUrl).toBe('');
      });
    });

    it('handles state with custom network configuration', async () => {
      const customState = {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            NetworkController: {
              ...initialState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                ...initialState.engine.backgroundState.NetworkController
                  .networkConfigurationsByChainId,
                '0x89': {
                  chainId: '0x89' as `0x${string}`,
                  rpcEndpoints: [
                    {
                      networkClientId: 'polygonNetworkClientId',
                    },
                  ],
                  defaultRpcEndpointIndex: 0,
                  nativeCurrency: 'MATIC',
                  name: 'Polygon Mainnet',
                },
              },
            },
          },
        },
      };

      mockBlockExplorerHook.getEvmBlockExplorerUrl.mockReturnValue(
        'https://polygonscan.com',
      );
      mockBlockExplorerHook.getBlockExplorerName.mockReturnValue('PolygonScan');

      const { result } = renderHookWithProvider(
        () =>
          useMultichainBlockExplorerTxUrl({
            chainId: 137,
            txHash: '0xpolygon123',
          }),
        { state: customState },
      );

      await waitFor(() => {
        expect(result.current?.chainName).toBe('Polygon Mainnet');
      });
    });
  });
});
