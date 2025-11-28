import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { isTestNet } from '../../../../../util/networks';
import { usePopularNetworks, EXCLUDED_NETWORKS } from './usePopularNetworks';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
  isTestNet: jest.fn(),
}));

jest.mock('../../../../../util/networks/customNetworks', () => ({
  PopularList: [
    {
      chainId: '0xa86a',
      nickname: 'Avalanche',
    },
    {
      chainId: '0xa4b1',
      nickname: 'Arbitrum',
    },
    {
      chainId: '0x38',
      nickname: 'BNB Chain',
    },
  ],
}));

describe('usePopularNetworks', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTestNet.mockReturnValue(false);
  });

  describe('basic functionality', () => {
    it('returns networks from networkConfigurations', () => {
      const mockNetworkConfigurations = {
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          name: 'Ethereum Mainnet',
        },
        'eip155:137': {
          caipChainId: 'eip155:137' as CaipChainId,
          name: 'Polygon',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      // Should have 2 from networkConfigurations + 3 from PopularList = 5 total
      expect(result.current.length).toBeGreaterThanOrEqual(5);
      expect(result.current.some((n) => n.name === 'Ethereum Mainnet')).toBe(
        true,
      );
      expect(result.current.some((n) => n.name === 'Polygon')).toBe(true);
      expect(result.current.some((n) => n.name === 'Avalanche')).toBe(true);
      expect(result.current.some((n) => n.name === 'Arbitrum')).toBe(true);
      expect(result.current.some((n) => n.name === 'BNB Chain')).toBe(true);
    });

    it('adds networks from PopularList that do not exist in networkConfigurations', () => {
      const mockNetworkConfigurations = {
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          name: 'Ethereum Mainnet',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      // Should have Ethereum Mainnet + 3 networks from PopularList
      expect(result.current.length).toBeGreaterThanOrEqual(4);
      expect(result.current.some((n) => n.name === 'Ethereum Mainnet')).toBe(
        true,
      );
      expect(result.current.some((n) => n.name === 'Avalanche')).toBe(true);
      expect(result.current.some((n) => n.name === 'Arbitrum')).toBe(true);
      expect(result.current.some((n) => n.name === 'BNB Chain')).toBe(true);
    });

    it('does not duplicate networks that exist in both networkConfigurations and PopularList', () => {
      const mockNetworkConfigurations = {
        'eip155:43114': {
          caipChainId: 'eip155:43114' as CaipChainId,
          name: 'Avalanche',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      const avalancheNetworks = result.current.filter(
        (n) => n.name === 'Avalanche',
      );
      expect(avalancheNetworks).toHaveLength(1);
    });
  });

  describe('testnet filtering', () => {
    it('filters out EVM testnets from networkConfigurations', () => {
      const mockNetworkConfigurations = {
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          name: 'Ethereum Mainnet',
        },
        'eip155:11155111': {
          caipChainId: 'eip155:11155111' as CaipChainId,
          name: 'Sepolia',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);
      // Sepolia chain ID in hex
      mockIsTestNet.mockImplementation((chainId) => chainId === '0xaa36a7');

      const { result } = renderHook(() => usePopularNetworks());

      // Should have 1 from networkConfigurations (Ethereum Mainnet) + 3 from PopularList = 4 total
      // Sepolia should be filtered out as it's a testnet
      expect(result.current.length).toBeGreaterThanOrEqual(4);
      expect(result.current.some((n) => n.name === 'Ethereum Mainnet')).toBe(
        true,
      );
      expect(result.current.some((n) => n.name === 'Sepolia')).toBe(false);
      expect(result.current.some((n) => n.name === 'Avalanche')).toBe(true);
      expect(result.current.some((n) => n.name === 'Arbitrum')).toBe(true);
      expect(result.current.some((n) => n.name === 'BNB Chain')).toBe(true);
    });

    it('filters out Bitcoin testnets from networkConfigurations', () => {
      const mockNetworkConfigurations = {
        // Bitcoin testnet variants using full CAIP IDs from BtcScope
        [BtcScope.Testnet]: {
          caipChainId: BtcScope.Testnet as CaipChainId,
          name: 'Bitcoin Testnet',
        },
        [BtcScope.Testnet4]: {
          caipChainId: BtcScope.Testnet4 as CaipChainId,
          name: 'Bitcoin Testnet4',
        },
        [BtcScope.Regtest]: {
          caipChainId: BtcScope.Regtest as CaipChainId,
          name: 'Bitcoin Regtest',
        },
        [BtcScope.Signet]: {
          caipChainId: BtcScope.Signet as CaipChainId,
          name: 'Bitcoin Signet',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      expect(result.current.some((n) => n.name === 'Bitcoin Testnet')).toBe(
        false,
      );
      expect(result.current.some((n) => n.name === 'Bitcoin Testnet4')).toBe(
        false,
      );
      expect(result.current.some((n) => n.name === 'Bitcoin Regtest')).toBe(
        false,
      );
      expect(result.current.some((n) => n.name === 'Bitcoin Signet')).toBe(
        false,
      );
    });

    it('filters out Solana Devnet from networkConfigurations', () => {
      const mockNetworkConfigurations = {
        [SolScope.Mainnet]: {
          caipChainId: SolScope.Mainnet as CaipChainId,
          name: 'Solana Mainnet',
        },
        [SolScope.Devnet]: {
          caipChainId: SolScope.Devnet as CaipChainId,
          name: 'Solana Devnet',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      expect(result.current.some((n) => n.name === 'Solana Mainnet')).toBe(
        true,
      );
      expect(result.current.some((n) => n.name === 'Solana Devnet')).toBe(
        false,
      );
    });
  });

  describe('custom network filtering', () => {
    it('filters EVM custom networks from networkConfigurations', () => {
      const mockNetworkConfigurations = {
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          name: 'Ethereum Mainnet',
        },
        'eip155:81457': {
          caipChainId: 'eip155:81457' as CaipChainId,
          chainId: '0x13e31',
          name: 'blast',
          rpcEndpoints: [
            {
              url: 'https://blast-rpc.publicnode.com',
              name: '',
              // Match RpcEndpointType.Custom value used in the hook
              type: 'custom',
              networkClientId: '0c8dd6d9-a167-4656-9057-b5daf33dbbde',
            },
          ],
          nativeCurrency: 'ETH',
          defaultRpcEndpointIndex: 0,
          lastUpdatedAt: 1763644775633,
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      expect(
        result.current.some(
          (network) => network.caipChainId === 'eip155:81457',
        ),
      ).toBe(false);
      expect(
        result.current.some((network) => network.caipChainId === 'eip155:1'),
      ).toBe(true);
    });
  });

  describe('excluded networks filtering', () => {
    it('filters out all excluded networks from networkConfigurations', () => {
      const mockNetworkConfigurations = {
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          name: 'Ethereum Mainnet',
        },
        'eip155:11297108109': {
          caipChainId: 'eip155:11297108109' as CaipChainId,
          name: 'Palm',
        },
        'eip155:999': {
          caipChainId: 'eip155:999' as CaipChainId,
          name: 'Hyper EVM',
        },
        'eip155:143': {
          caipChainId: 'eip155:143' as CaipChainId,
          name: 'Monad',
        },
        'bip122:000000000019d6689c085ae165831e93': {
          caipChainId: 'bip122:000000000019d6689c085ae165831e93' as CaipChainId,
          name: 'Bitcoin Mainnet',
        },
        'eip155:137': {
          caipChainId: 'eip155:137' as CaipChainId,
          name: 'Polygon',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      const resultChainIds = result.current.map((n) => n.caipChainId);
      EXCLUDED_NETWORKS.forEach((excludedChainId) => {
        expect(resultChainIds).not.toContain(excludedChainId);
      });
      expect(result.current.some((n) => n.name === 'Ethereum Mainnet')).toBe(
        true,
      );
      expect(result.current.some((n) => n.name === 'Polygon')).toBe(true);
    });
  });

  describe('sorting', () => {
    it('sorts Ethereum Mainnet first', () => {
      const mockNetworkConfigurations = {
        'eip155:137': {
          caipChainId: 'eip155:137' as CaipChainId,
          name: 'Polygon',
        },
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          name: 'Ethereum Mainnet',
        },
        'eip155:42161': {
          caipChainId: 'eip155:42161' as CaipChainId,
          name: 'Arbitrum',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      expect(result.current[0].caipChainId).toBe('eip155:1');
      expect(result.current[0].name).toBe('Ethereum Mainnet');
    });

    it('sorts Linea Mainnet second', () => {
      const mockNetworkConfigurations = {
        'eip155:137': {
          caipChainId: 'eip155:137' as CaipChainId,
          name: 'Polygon',
        },
        'eip155:59144': {
          caipChainId: 'eip155:59144' as CaipChainId,
          name: 'Linea Main Network',
        },
        'eip155:1': {
          caipChainId: 'eip155:1' as CaipChainId,
          name: 'Ethereum Mainnet',
        },
      };

      mockUseSelector.mockReturnValue(mockNetworkConfigurations);

      const { result } = renderHook(() => usePopularNetworks());

      expect(result.current[0].caipChainId).toBe('eip155:1');
      expect(result.current[0].name).toBe('Ethereum Mainnet');
      expect(result.current[1].caipChainId).toBe('eip155:59144');
      expect(result.current[1].name).toBe('Linea Main Network');
    });
  });
});
