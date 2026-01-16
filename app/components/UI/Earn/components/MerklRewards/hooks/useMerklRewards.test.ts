import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { isEligibleForMerklRewards, useMerklRewards } from './useMerklRewards';
import { TokenI } from '../../../../Tokens/types';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../../selectors/currencyRateController';
import { selectNativeCurrencyByChainId } from '../../../../../../selectors/networkController';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../constants/musd';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../util/number', () => ({
  renderFromTokenMinimalUnit: jest.fn((value: string, decimals: number) => {
    // Simple mock conversion: divide by 10^decimals
    const divisor = Math.pow(10, decimals);
    return (parseInt(value, 10) / divisor).toFixed(2);
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockAsset: TokenI = {
  name: 'Angle Merkl',
  symbol: 'aglaMerkl',
  address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as const,
  chainId: CHAIN_IDS.MAINNET,
  decimals: 18,
  aggregators: [],
  image: '',
  balance: '1000',
  balanceFiat: '$100',
  logo: '',
  isETH: false,
  isNative: false,
};

describe('isEligibleForMerklRewards', () => {
  it('returns true for eligible token on mainnet', () => {
    const result = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as const,
    );
    expect(result).toBe(true);
  });

  it('returns false for ineligible token', () => {
    const result = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      '0x1234567890123456789012345678901234567890' as const,
    );
    expect(result).toBe(false);
  });

  it('returns false for unsupported chain', () => {
    const result = isEligibleForMerklRewards(
      '0x5' as const, // Goerli
      '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as const,
    );
    expect(result).toBe(false);
  });

  it('returns true for eligible token with different casing (case-insensitive)', () => {
    // Test with all lowercase address
    const resultLower = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      '0x8d652c6d4a8f3db96cd866c1a9220b1447f29898' as const,
    );
    expect(resultLower).toBe(true);

    // Test with all uppercase address
    const resultUpper = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      '0x8D652C6D4A8F3DB96CD866C1A9220B1447F29898' as const,
    );
    expect(resultUpper).toBe(true);

    // Test with mixed case (different from hardcoded constant)
    const resultMixed = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      '0x8D652c6d4A8F3Db96Cd866C1a9220B1447F29898' as const,
    );
    expect(resultMixed).toBe(true);
  });
});

describe('useMerklRewards', () => {
  const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
  const mockNativeCurrency = 'ETH';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectCurrencyRates) {
        return {};
      }
      if (selector === selectCurrentCurrency) {
        return 'USD';
      }
      if (selector === selectNativeCurrencyByChainId) {
        return mockNativeCurrency;
      }
      return undefined;
    });
  });

  it('returns null claimableReward when asset is not eligible', () => {
    const ineligibleAsset = {
      ...mockAsset,
      address: '0x1234567890123456789012345678901234567890' as const,
    };

    const { result } = renderHook(() =>
      useMerklRewards({ asset: ineligibleAsset }),
    );

    expect(result.current.claimableReward).toBe(null);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns null claimableReward when selectedAddress is not available', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return null;
      }
      return undefined;
    });

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    expect(result.current.claimableReward).toBe(null);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and sets claimableReward when eligible', async () => {
    const mockPendingWei = '1500000000000000000'; // 1.5 tokens in wei
    const mockResponse = [
      {
        rewards: [
          {
            pending: mockPendingWei,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );

    expect(renderFromTokenMinimalUnit).toHaveBeenCalledWith(
      mockPendingWei,
      18,
      2,
    );
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: false,
          status: 500,
        };
      },
    );

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });
  });

  it('handles fetch error gracefully', async () => {
    const error = new Error('Network error');
    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          throw abortError;
        }
        throw error;
      },
    );

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });
  });

  it('returns null when no pending rewards in response', async () => {
    const mockResponse = [
      {
        rewards: [],
      },
    ];

    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => mockResponse,
        };
      },
    );

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });
  });

  it('calls API with correct chainId', async () => {
    const mockResponse = [
      {
        rewards: [
          {
            pending: '1000000000000000000',
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => mockResponse,
        };
      },
    );

    renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // API expects decimal chainId (e.g., 1) not hex (e.g., 0x1)
    const expectedDecimalChainId = Number(CHAIN_IDS.MAINNET);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`chainId=${expectedDecimalChainId}`),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('resets claimableReward when switching between eligible assets', async () => {
    const mockPendingWeiAsset1 = '1500000000000000000'; // 1.5 tokens
    const mockResponseAsset1 = [
      {
        rewards: [
          {
            pending: mockPendingWeiAsset1,
          },
        ],
      },
    ];

    // First asset with rewards
    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => mockResponseAsset1,
        };
      },
    );

    const { result, rerender } = renderHook(
      ({ asset }) => useMerklRewards({ asset }),
      {
        initialProps: { asset: mockAsset },
      },
    );

    // Wait for first fetch to complete
    await waitFor(() => {
      expect(result.current.claimableReward).toBe('1.50');
    });

    // Switch to a different eligible asset (mUSD on Linea)
    const mockAsset2: TokenI = {
      ...mockAsset,
      address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET] as const,
      chainId: CHAIN_IDS.LINEA_MAINNET,
      symbol: 'mUSD',
    };

    // Mock a delayed response for the second asset
    let resolveSecondFetch: (value: unknown) => void;
    const secondFetchPromise = new Promise<unknown>((resolve) => {
      resolveSecondFetch = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => secondFetchPromise,
        };
      },
    );

    // Switch to second asset
    rerender({ asset: mockAsset2 });

    // State should be reset immediately when switching assets
    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });

    // Resolve the second fetch with new data
    const mockPendingWeiAsset2 = '2000000000000000000'; // 2.0 tokens
    const mockResponseAsset2 = [
      {
        rewards: [
          {
            pending: mockPendingWeiAsset2,
          },
        ],
      },
    ];
    resolveSecondFetch(mockResponseAsset2);

    // Wait for second fetch to complete
    await waitFor(() => {
      expect(result.current.claimableReward).toBe('2.00');
    });
  });

  it('returns null when pending reward is zero', async () => {
    const mockResponse = [
      {
        rewards: [
          {
            pending: '0', // Zero pending rewards
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => mockResponse,
        };
      },
    );

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      // Should remain null because pending is zero
      expect(result.current.claimableReward).toBe(null);
    });

    // renderFromTokenMinimalUnit should not be called for zero values
    expect(renderFromTokenMinimalUnit).not.toHaveBeenCalled();
  });

  it('returns null when rendered amount is "0" or "0.00"', async () => {
    // Mock renderFromTokenMinimalUnit to return '0' or '0.00' for edge cases
    (renderFromTokenMinimalUnit as jest.Mock).mockReturnValueOnce('0.00');

    const mockPendingWei = '1'; // Very small amount that might round to zero
    const mockResponse = [
      {
        rewards: [
          {
            pending: mockPendingWei,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => mockResponse,
        };
      },
    );

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      // Should remain null because rendered amount is '0.00'
      expect(result.current.claimableReward).toBe(null);
    });
  });

  it('aborts previous fetch when switching assets to prevent race condition', async () => {
    const mockPendingWeiAsset1 = '1500000000000000000'; // 1.5 tokens
    const mockResponseAsset1 = [
      {
        rewards: [
          {
            pending: mockPendingWeiAsset1,
          },
        ],
      },
    ];

    // Create a delayed promise for the first asset to simulate slow network
    let resolveFirstFetch: (value: unknown) => void;
    const firstFetchPromise = new Promise<unknown>((resolve) => {
      resolveFirstFetch = resolve;
    });

    let firstFetchAbortSignal: AbortSignal | undefined;
    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        firstFetchAbortSignal = options?.signal;
        // Wait for the promise to resolve (simulating slow network)
        await firstFetchPromise;
        // Check if aborted after waiting
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => mockResponseAsset1,
        };
      },
    );

    const { result, rerender } = renderHook(
      ({ asset }) => useMerklRewards({ asset }),
      {
        initialProps: { asset: mockAsset },
      },
    );

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Switch to a different asset before first fetch completes
    const mockAsset2: TokenI = {
      ...mockAsset,
      address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET] as const,
      chainId: CHAIN_IDS.LINEA_MAINNET,
      symbol: 'mUSD',
    };

    const mockPendingWeiAsset2 = '2000000000000000000'; // 2.0 tokens
    const mockResponseAsset2 = [
      {
        rewards: [
          {
            pending: mockPendingWeiAsset2,
          },
        ],
      },
    ];

    // Second fetch should complete quickly
    (global.fetch as jest.Mock).mockImplementationOnce(
      async (_url: string, options?: { signal?: AbortSignal }) => {
        // Check if aborted before resolving
        if (options?.signal?.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
        return {
          ok: true,
          json: async () => mockResponseAsset2,
        };
      },
    );

    // Switch to second asset - this should abort the first fetch
    rerender({ asset: mockAsset2 });

    // Verify first fetch was aborted
    await waitFor(() => {
      expect(firstFetchAbortSignal?.aborted).toBe(true);
    });

    // Wait for second fetch to complete
    await waitFor(() => {
      expect(result.current.claimableReward).toBe('2.00');
    });

    // Now resolve the first fetch (simulating it completing late)
    resolveFirstFetch(mockResponseAsset1);

    // Wait a bit to ensure state doesn't change
    await new Promise((resolve) => setTimeout(resolve, 100));

    // State should still be from the second asset, not the first
    expect(result.current.claimableReward).toBe('2.00');
  });
});
