import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { isEligibleForMerklRewards, useMerklRewards } from './useMerklRewards';
import { TokenI } from '../../Tokens/types';
import { renderFromTokenMinimalUnit } from '../../../../util/number';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/number', () => ({
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
});

describe('useMerklRewards', () => {
  const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
  const mockNativeCurrency = 'ETH';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (
        typeof selector === 'function' &&
        selector
          .toString()
          .includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return mockSelectedAddress;
      }
      if (
        typeof selector === 'function' &&
        selector.toString().includes('selectCurrencyRates')
      ) {
        return {};
      }
      if (
        typeof selector === 'function' &&
        selector.toString().includes('selectCurrentCurrency')
      ) {
        return 'USD';
      }
      if (
        typeof selector === 'function' &&
        selector.toString().includes('selectNativeCurrencyByChainId')
      ) {
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
      if (
        typeof selector === 'function' &&
        selector
          .toString()
          .includes('selectSelectedInternalAccountFormattedAddress')
      ) {
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

    await waitFor(() => {
      expect(result.current.claimableReward).toBe('1.50');
    });

    expect(renderFromTokenMinimalUnit).toHaveBeenCalledWith(
      mockPendingWei,
      18,
      2,
    );
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to fetch Merkl rewards:',
      500,
    );

    consoleSpy.mockRestore();
  });

  it('handles fetch error gracefully', async () => {
    const error = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching Merkl rewards:',
      error,
    );

    consoleSpy.mockRestore();
  });

  it('returns null when no pending rewards in response', async () => {
    const mockResponse = [
      {
        rewards: [],
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

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`chainId=${CHAIN_IDS.MAINNET}`),
    );
  });
});
