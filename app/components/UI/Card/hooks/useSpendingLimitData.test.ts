import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useSpendingLimitData from './useSpendingLimitData';
import { useCardSDK } from '../sdk';
import useGetDelegationSettings from './useGetDelegationSettings';
import { AllowanceState, DelegationSettingsResponse } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('./useGetDelegationSettings', () => jest.fn());

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseGetDelegationSettings =
  useGetDelegationSettings as jest.MockedFunction<
    typeof useGetDelegationSettings
  >;

const createMockDelegationSettings = (
  overrides: Partial<DelegationSettingsResponse> = {},
): DelegationSettingsResponse => ({
  networks: [
    {
      network: 'linea',
      environment: 'production',
      chainId: '59144',
      delegationContract: '0xlineaDelegation',
      tokens: {
        usdc: { symbol: 'usdc', decimals: 6, address: '0xlineaUsdc' },
        usdt: { symbol: 'usdt', decimals: 6, address: '0xlineaUsdt' },
      },
    },
    {
      network: 'base',
      environment: 'production',
      chainId: '8453',
      delegationContract: '0xbaseDelegation',
      tokens: {
        usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
      },
    },
  ],
  count: 2,
  _links: { self: 'https://api.example.com' },
  ...overrides,
});

const createMockSDK = (tokensByChain: Record<string, unknown[]> = {}) => ({
  getSupportedTokensByChainId: jest.fn((chainId?: string) => {
    if (chainId && tokensByChain[chainId]) {
      return tokensByChain[chainId];
    }
    return [];
  }),
});

// Default mock values for selectors (order: isAuthenticated, userCardLocation)
let mockIsAuthenticated = true;
let mockUserCardLocation: string | null = 'international';

describe('useSpendingLimitData', () => {
  const mockFetchDelegationSettings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockUserCardLocation = 'international';

    // useSelector is called in order: selectIsAuthenticatedCard, selectUserCardLocation
    let selectorCallCount = 0;
    mockUseSelector.mockImplementation(() => {
      selectorCallCount++;
      if (selectorCallCount % 2 === 1) return mockIsAuthenticated;
      return mockUserCardLocation;
    });

    mockUseCardSDK.mockReturnValue({
      sdk: createMockSDK(),
    } as unknown as ReturnType<typeof useCardSDK>);

    mockUseGetDelegationSettings.mockReturnValue({
      data: createMockDelegationSettings(),
      isLoading: false,
      error: null,
      fetchData: mockFetchDelegationSettings,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial State', () => {
    it('returns tokens from delegation settings even when SDK is not available', () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
      } as ReturnType<typeof useCardSDK>);

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens.length).toBeGreaterThan(0);
      expect(result.current.availableTokens[0].symbol).toBe('USDC');
    });

    it('returns empty tokens when delegation settings are not available', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens).toEqual([]);
    });

    it('returns loading state from delegation settings hook', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns error state from delegation settings hook', () => {
      const testError = new Error('Test error');
      mockUseGetDelegationSettings.mockReturnValue({
        data: null,
        isLoading: false,
        error: testError,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.error).toBe(testError);
    });

    it('returns delegation settings from hook', () => {
      const mockSettings = createMockDelegationSettings();
      mockUseGetDelegationSettings.mockReturnValue({
        data: mockSettings,
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.delegationSettings).toBe(mockSettings);
    });
  });

  describe('Network Filtering', () => {
    it('filters out unsupported networks like ethereum', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'ethereum',
              environment: 'production',
              chainId: '1',
              delegationContract: '0xethDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xethUsdc' },
              },
            },
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      const networks = result.current.availableTokens.map((t) => t.caipChainId);
      expect(networks).not.toContain('eip155:1');
      expect(networks).toContain('eip155:8453');
    });

    it('includes Solana network', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'solana',
              environment: 'production',
              chainId: 'mainnet',
              delegationContract: '0xsolanaDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: 'solanaUsdc' },
              },
            },
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      const hasSolana = result.current.availableTokens.some((t) =>
        t.caipChainId.includes('solana'),
      );
      expect(hasSolana).toBe(true);
    });
  });

  describe('Token Processing', () => {
    it('creates tokens with correct caipChainId for EVM networks', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].caipChainId).toBe('eip155:8453');
    });

    it('creates tokens with correct caipChainId for hex chainId', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '0x2105',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].caipChainId).toBe('eip155:8453');
    });

    it('skips tokens without address', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
                usdt: { symbol: 'usdt', decimals: 6, address: '' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens).toHaveLength(1);
      expect(result.current.availableTokens[0].symbol).toBe('USDC');
    });

    it('skips duplicate tokens with same address and chainId', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
                usdc2: { symbol: 'usdc2', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens).toHaveLength(1);
    });

    it('uppercases symbol when SDK metadata is not available', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].symbol).toBe('USDC');
      expect(result.current.availableTokens[0].name).toBe('USDC');
    });

    it('uses SDK metadata for symbol and name when available', () => {
      const mockSDK = createMockSDK({
        'eip155:8453': [
          { address: '0xbaseUsdc', symbol: 'USDC', name: 'USD Coin' },
        ],
      });
      mockUseCardSDK.mockReturnValue({
        sdk: mockSDK,
      } as unknown as ReturnType<typeof useCardSDK>);

      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].symbol).toBe('USDC');
      expect(result.current.availableTokens[0].name).toBe('USD Coin');
    });

    it('sets allowanceState to NotEnabled for all tokens', () => {
      const { result } = renderHook(() => useSpendingLimitData());

      result.current.availableTokens.forEach((token) => {
        expect(token.allowanceState).toBe(AllowanceState.NotEnabled);
      });
    });

    it('sets allowance to 0 for all tokens', () => {
      const { result } = renderHook(() => useSpendingLimitData());

      result.current.availableTokens.forEach((token) => {
        expect(token.allowance).toBe('0');
      });
    });

    it('includes delegationContract from network config', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xCustomDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].delegationContract).toBe(
        '0xCustomDelegation',
      );
    });
  });

  describe('Staging Environment Handling', () => {
    it('uses SDK address for staging environment when available', () => {
      const mockSDK = createMockSDK({
        'eip155:8453': [
          {
            address: '0xSdkStagingUsdc',
            symbol: 'USDC',
            name: 'USD Coin',
          },
        ],
      });
      mockUseCardSDK.mockReturnValue({
        sdk: mockSDK,
      } as unknown as ReturnType<typeof useCardSDK>);

      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'staging',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: {
                  symbol: 'usdc',
                  decimals: 6,
                  address: '0xConfigStagingUsdc',
                },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].address).toBe(
        '0xSdkStagingUsdc',
      );
      expect(result.current.availableTokens[0].stagingTokenAddress).toBe(
        '0xConfigStagingUsdc',
      );
    });

    it('uses config address for staging when SDK match not found', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'staging',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: {
                  symbol: 'usdc',
                  decimals: 6,
                  address: '0xConfigStagingUsdc',
                },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].address).toBe(
        '0xConfigStagingUsdc',
      );
    });

    it('does not set stagingTokenAddress for production environment', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xProdUsdc' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens[0].stagingTokenAddress).toBe(
        undefined,
      );
    });
  });

  describe('fetchData', () => {
    it('calls fetchDelegationSettings when authenticated', async () => {
      mockIsAuthenticated = true;

      const { result } = renderHook(() => useSpendingLimitData());

      await result.current.fetchData();

      expect(mockFetchDelegationSettings).toHaveBeenCalledTimes(1);
    });

    it('does not call fetchDelegationSettings when not authenticated', async () => {
      mockIsAuthenticated = false;

      const { result } = renderHook(() => useSpendingLimitData());

      await result.current.fetchData();

      expect(mockFetchDelegationSettings).not.toHaveBeenCalled();
    });
  });

  describe('Return Value Structure', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current).toHaveProperty('availableTokens');
      expect(result.current).toHaveProperty('delegationSettings');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchData');
    });

    it('returns availableTokens as array', () => {
      const { result } = renderHook(() => useSpendingLimitData());

      expect(Array.isArray(result.current.availableTokens)).toBe(true);
    });

    it('returns fetchData as function', () => {
      const { result } = renderHook(() => useSpendingLimitData());

      expect(typeof result.current.fetchData).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty networks array', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({ networks: [] }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens).toEqual([]);
    });

    it('handles network with empty tokens object', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {},
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens).toEqual([]);
    });

    it('handles network with undefined tokens', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: undefined as unknown as Record<
                string,
                { symbol: string; decimals: number; address: string }
              >,
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens).toEqual([]);
    });

    it('handles multiple tokens across multiple networks', () => {
      mockUserCardLocation = 'international';

      mockUseGetDelegationSettings.mockReturnValue({
        data: createMockDelegationSettings({
          networks: [
            {
              network: 'linea',
              environment: 'production',
              chainId: '59144',
              delegationContract: '0xlineaDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xlineaUsdc' },
                usdt: { symbol: 'usdt', decimals: 6, address: '0xlineaUsdt' },
              },
            },
            {
              network: 'base',
              environment: 'production',
              chainId: '8453',
              delegationContract: '0xbaseDelegation',
              tokens: {
                usdc: { symbol: 'usdc', decimals: 6, address: '0xbaseUsdc' },
                weth: { symbol: 'weth', decimals: 18, address: '0xbaseWeth' },
              },
            },
          ],
        }),
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useSpendingLimitData());

      expect(result.current.availableTokens).toHaveLength(4);

      const lineaTokens = result.current.availableTokens.filter(
        (t) => t.caipChainId === 'eip155:59144',
      );
      const baseTokens = result.current.availableTokens.filter(
        (t) => t.caipChainId === 'eip155:8453',
      );

      expect(lineaTokens).toHaveLength(2);
      expect(baseTokens).toHaveLength(2);
    });
  });
});
