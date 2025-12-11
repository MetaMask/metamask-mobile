import { RpcEndpointType } from '@metamask/network-controller';

import { createProviderConfig } from '../../../../../selectors/networkController';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { mockNetworkState } from '../../../../../util/test/network';
import { useLegacySwapsBlockExplorer } from '.';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName,
} from '../../../../../util/networks';

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  findBlockExplorerForRpc: jest.fn(),
  getBlockExplorerName: jest.fn(),
}));

const mockFindBlockExplorerForRpc = jest.mocked(findBlockExplorerForRpc);
const mockGetBlockExplorerName = jest.mocked(getBlockExplorerName);

interface MockNetworkOverrides {
  chainId: `0x${string}`;
  id?: string;
  nickname?: string;
  ticker?: string;
  blockExplorerUrl?: string;
  rpcUrl?: string;
  type?: RpcEndpointType;
}

const renderUseBlockExplorerHook = (
  overrides: MockNetworkOverrides,
  providerConfigOverride?: Parameters<typeof useLegacySwapsBlockExplorer>[1],
) => {
  const networkConfigurations = mockNetworkState(overrides);
  const networkConfiguration =
    networkConfigurations.networkConfigurationsByChainId[overrides.chainId];
  const rpcEndpoint =
    networkConfiguration?.rpcEndpoints?.[
      networkConfiguration?.defaultRpcEndpointIndex
    ];
  const providerConfig = createProviderConfig(
    networkConfiguration,
    rpcEndpoint,
  );

  const { result } = renderHookWithProvider(
    () =>
      useLegacySwapsBlockExplorer(
        networkConfigurations.networkConfigurationsByChainId,
        providerConfigOverride !== undefined
          ? providerConfigOverride
          : providerConfig,
      ),
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: networkConfigurations,
          },
        },
      },
    },
  );
  return result.current;
};

describe('useLegacySwapsBlockExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to actual implementations by default
    mockFindBlockExplorerForRpc.mockImplementation(
      jest.requireActual('../../../../../util/networks')
        .findBlockExplorerForRpc,
    );
    mockGetBlockExplorerName.mockImplementation(
      jest.requireActual('../../../../../util/networks').getBlockExplorerName,
    );
  });

  describe('explorer resolution', () => {
    it('returns correct explorer object for a custom RPC network with https protocol', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer).toStrictEqual({
        name: 'Arbitrumscan',
        value: 'https://arbitrumscan.io',
        isValid: true,
        isRPC: true,
        baseUrl: 'https://arbitrumscan.io/',
        token: expect.any(Function),
        tx: expect.any(Function),
        account: expect.any(Function),
      });
    });

    it('returns correct explorer object for a custom RPC network with http protocol', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'http://arbitrumscan.io',
      });

      expect(explorer).toStrictEqual({
        name: 'Arbitrumscan',
        value: 'http://arbitrumscan.io',
        isValid: true,
        isRPC: true,
        baseUrl: 'http://arbitrumscan.io/',
        token: expect.any(Function),
        tx: expect.any(Function),
        account: expect.any(Function),
      });
    });

    it('returns correct explorer object for built-in Infura network', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0x1',
        id: 'mainnet',
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://etherscan.io',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
        type: RpcEndpointType.Infura,
      });

      expect(explorer).toStrictEqual({
        name: 'Etherscan',
        value: 'https://etherscan.io',
        isValid: true,
        isRPC: false,
        baseUrl: 'https://etherscan.io/',
        token: expect.any(Function),
        tx: expect.any(Function),
        account: expect.any(Function),
      });
    });

    it('falls back to selector providerConfig when providerConfigTokenExplorer is null', () => {
      const explorer = renderUseBlockExplorerHook(
        {
          chainId: '0x1',
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          blockExplorerUrl: 'https://etherscan.io',
          rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
          type: RpcEndpointType.Infura,
        },
        null,
      );

      expect(explorer.isValid).toBe(true);
      expect(explorer.name).toBe('Etherscan');
    });

    it('falls back to selector providerConfig when providerConfigTokenExplorer is undefined', () => {
      const networkConfigurations = mockNetworkState({
        chainId: '0x1',
        id: 'mainnet',
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://etherscan.io',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
        type: RpcEndpointType.Infura,
      });

      const { result } = renderHookWithProvider(
        () =>
          useLegacySwapsBlockExplorer(
            networkConfigurations.networkConfigurationsByChainId,
          ),
        {
          state: {
            engine: {
              backgroundState: {
                NetworkController: networkConfigurations,
              },
            },
          },
        },
      );

      expect(result.current.isValid).toBe(true);
      expect(result.current.name).toBe('Etherscan');
    });

    it('uses fallback name when getBlockExplorerName returns undefined', () => {
      mockGetBlockExplorerName.mockReturnValueOnce(undefined);

      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer.name).toBe('block explorer');
      expect(explorer.isValid).toBe(true);
    });

    it('returns invalid explorer when no block explorer URL exists', () => {
      mockFindBlockExplorerForRpc.mockReturnValueOnce(undefined);

      const explorer = renderUseBlockExplorerHook({
        chainId: '0x999',
        id: 'custom-no-explorer',
        nickname: 'Custom Network',
        ticker: 'ETH',
        blockExplorerUrl: '',
      });

      expect(explorer).toStrictEqual({
        name: '',
        value: null,
        isValid: false,
        isRPC: false,
        baseUrl: '',
        token: expect.any(Function),
        tx: expect.any(Function),
        account: expect.any(Function),
      });
    });

    it('returns invalid explorer when block explorer URL has invalid protocol', () => {
      mockFindBlockExplorerForRpc.mockReturnValueOnce(
        'ftp://invalid-protocol.io',
      );

      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer).toStrictEqual({
        name: '',
        value: null,
        isValid: false,
        isRPC: false,
        baseUrl: '',
        token: expect.any(Function),
        tx: expect.any(Function),
        account: expect.any(Function),
      });
    });
  });

  describe('tx callback', () => {
    it('returns transaction URL when explorer is valid and hash is provided', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer.tx('0x456')).toBe('https://arbitrumscan.io/tx/0x456');
    });

    it('returns empty string when hash is undefined', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer.tx(undefined)).toBe('');
    });

    it('returns empty string when hash is empty string', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer.tx('')).toBe('');
    });

    it('returns empty string when explorer is invalid', () => {
      mockFindBlockExplorerForRpc.mockReturnValueOnce(undefined);

      const explorer = renderUseBlockExplorerHook({
        chainId: '0x999',
        id: 'custom-no-explorer',
        nickname: 'Custom Network',
        ticker: 'ETH',
        blockExplorerUrl: '',
      });

      expect(explorer.tx('0x456')).toBe('');
    });
  });

  describe('account callback', () => {
    it('returns account URL when explorer is valid', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer.account('0x789')).toBe(
        'https://arbitrumscan.io/address/0x789',
      );
    });

    it('returns empty string when explorer is invalid', () => {
      mockFindBlockExplorerForRpc.mockReturnValueOnce(undefined);

      const explorer = renderUseBlockExplorerHook({
        chainId: '0x999',
        id: 'custom-no-explorer',
        nickname: 'Custom Network',
        ticker: 'ETH',
        blockExplorerUrl: '',
      });

      expect(explorer.account('0x789')).toBe('');
    });
  });

  describe('token callback', () => {
    it('returns token URL when explorer is valid', () => {
      const explorer = renderUseBlockExplorerHook({
        chainId: '0xa4b1',
        id: 'arbitrum',
        nickname: 'Arbitrum Mainnet',
        ticker: 'ETH',
        blockExplorerUrl: 'https://arbitrumscan.io',
      });

      expect(explorer.token('0x123')).toBe(
        'https://arbitrumscan.io/token/0x123',
      );
    });

    it('returns empty string when explorer is invalid', () => {
      mockFindBlockExplorerForRpc.mockReturnValueOnce(undefined);

      const explorer = renderUseBlockExplorerHook({
        chainId: '0x999',
        id: 'custom-no-explorer',
        nickname: 'Custom Network',
        ticker: 'ETH',
        blockExplorerUrl: '',
      });

      expect(explorer.token('0x123')).toBe('');
    });
  });
});
