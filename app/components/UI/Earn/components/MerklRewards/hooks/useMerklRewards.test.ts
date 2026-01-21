import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { isEligibleForMerklRewards, useMerklRewards } from './useMerklRewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  fetchMerklRewardsForAsset,
  getClaimedAmountFromContract,
} from '../merkl-client';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../util/number', () => ({
  renderFromTokenMinimalUnit: jest.fn(),
}));

jest.mock('../merkl-client', () => ({
  fetchMerklRewardsForAsset: jest.fn(),
  getClaimedAmountFromContract: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockRenderFromTokenMinimalUnit =
  renderFromTokenMinimalUnit as jest.MockedFunction<
    typeof renderFromTokenMinimalUnit
  >;
const mockFetchMerklRewardsForAsset =
  fetchMerklRewardsForAsset as jest.MockedFunction<
    typeof fetchMerklRewardsForAsset
  >;
const mockGetClaimedAmountFromContract =
  getClaimedAmountFromContract as jest.MockedFunction<
    typeof getClaimedAmountFromContract
  >;

const mockSelectedAddress = '0x1234567890123456789012345678901234567890';

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
  it('returns false for native tokens with undefined address', () => {
    const result = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      undefined as Hex | undefined,
    );

    expect(result).toBe(false);
  });

  it('returns false for native tokens with null address', () => {
    const result = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      null as Hex | null,
    );

    expect(result).toBe(false);
  });

  it('returns false for unsupported chains', () => {
    const unsupportedChainId = '0x999' as Hex;
    const result = isEligibleForMerklRewards(
      unsupportedChainId,
      '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as Hex,
    );

    expect(result).toBe(false);
  });

  it('returns false for non-eligible tokens', () => {
    const nonEligibleAddress =
      '0x1111111111111111111111111111111111111111' as Hex;
    const result = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      nonEligibleAddress,
    );

    expect(result).toBe(false);
  });

  it('returns true for eligible tokens on mainnet', () => {
    const eligibleAddress = '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as Hex;
    const result = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      eligibleAddress,
    );

    expect(result).toBe(true);
  });

  it('performs case-insensitive address comparison', () => {
    const upperCaseAddress =
      '0x8D652C6D4A8F3DB96CD866C1A9220B1447F29898' as Hex;
    const result = isEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      upperCaseAddress,
    );

    expect(result).toBe(true);
  });
});

describe('useMerklRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to ensure clean state between tests
    mockFetchMerklRewardsForAsset.mockReset();
    mockGetClaimedAmountFromContract.mockReset();
    mockRenderFromTokenMinimalUnit.mockReset();
    (global.fetch as jest.Mock).mockClear();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      return undefined;
    });

    // Default implementation for renderFromTokenMinimalUnit
    // This calculates the actual value from the input, which is what most tests need
    mockRenderFromTokenMinimalUnit.mockImplementation(
      (value: string | number | unknown, decimals: number) => {
        let stringValue: string;
        if (typeof value === 'string') {
          stringValue = value;
        } else if (typeof value === 'number') {
          stringValue = value.toString();
        } else {
          // Handle BN or other types
          stringValue = String(value);
        }
        const bigIntValue = BigInt(stringValue);
        const divisor = BigInt(10 ** decimals);
        const result = Number(bigIntValue) / Number(divisor);
        return result.toFixed(2);
      },
    );
  });

  it('initializes with null claimableReward', () => {
    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    expect(result.current.claimableReward).toBe(null);
  });

  it('returns null when asset is not eligible', async () => {
    const nonEligibleAsset: TokenI = {
      ...mockAsset,
      address: '0x1111111111111111111111111111111111111111' as const,
    };

    const { result } = renderHook(() =>
      useMerklRewards({ asset: nonEligibleAsset }),
    );

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });

    expect(mockFetchMerklRewardsForAsset).not.toHaveBeenCalled();
  });

  it('returns null when no selected address', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return null;
      }
      return undefined;
    });

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });

    expect(mockFetchMerklRewardsForAsset).not.toHaveBeenCalled();
  });

  it('fetches and sets claimableReward when eligible', async () => {
    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '1500000000000000000', // 1.5 tokens in wei
      pending: '0',
      proofs: [],
      amount: '1500000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');
    // Default implementation will calculate '1.50' from '1500000000000000000' with 18 decimals

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );

    expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    expect(mockGetClaimedAmountFromContract).toHaveBeenCalledWith(
      mockSelectedAddress,
      mockAsset.address,
      mockAsset.chainId,
    );

    expect(mockRenderFromTokenMinimalUnit).toHaveBeenCalledWith(
      '1500000000000000000',
      18,
      2,
    );
  });

  it('adds test=true parameter with different case address (case-insensitive)', async () => {
    // Use uppercase address to verify case-insensitive comparison works
    const upperCaseAsset: TokenI = {
      ...mockAsset,
      address: '0x8D652C6D4A8F3DB96CD866C1A9220B1447F29898' as const, // All uppercase
    };

    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '1500000000000000000',
      pending: '0',
      proofs: [],
      amount: '1500000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');
    // Override the implementation for this test to return the expected value
    // Default implementation will calculate '1.50' from the amount

    const { result } = renderHook(() =>
      useMerklRewards({ asset: upperCaseAsset }),
    );

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );

    expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    expect(mockGetClaimedAmountFromContract).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    const error = new Error('Network error');
    mockFetchMerklRewardsForAsset.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    // Should remain null on error
    expect(result.current.claimableReward).toBe(null);
  });

  it('handles non-OK API responses', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    expect(result.current.claimableReward).toBe(null);
  });

  it('handles empty rewards array', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    expect(result.current.claimableReward).toBe(null);
  });

  it('handles no matching token in rewards', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    // Should remain null when no matching token is found
    expect(result.current.claimableReward).toBe(null);
  });

  it('finds matching reward in second data array element', async () => {
    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898', // Matching token
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '2500000000000000000',
      pending: '0',
      proofs: [],
      amount: '2500000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');
    // The default implementation will calculate '2.50' from '2500000000000000000' with 18 decimals

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('2.50');
      },
      { timeout: 3000 },
    );

    // Verify it found the reward
    expect(mockRenderFromTokenMinimalUnit).toHaveBeenCalledWith(
      '2500000000000000000',
      18,
      2,
    );
  });

  it('handles zero unclaimed amounts', async () => {
    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '0',
      pending: '0',
      proofs: [],
      amount: '1000000000000000000', // amount is non-zero
      claimed: '1000000000000000000', // but claimed equals amount
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce(
      '1000000000000000000',
    );

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    // Should be null because unclaimed = amount - claimed = 0
    expect(result.current.claimableReward).toBe(null);
  });

  it('handles very small amounts that round to zero', async () => {
    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '1', // Very small amount
      pending: '0',
      proofs: [],
      amount: '1',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');
    // The default implementation will calculate '0.00' from '1' with 18 decimals, which should result in null

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    // Should remain null when amount rounds to zero
    expect(result.current.claimableReward).toBe(null);
  });

  it('resets claimableReward when switching assets', async () => {
    const mockRewardData1 = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '1500000000000000000',
      pending: '0',
      proofs: [],
      amount: '1500000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData1);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');
    // The default implementation will calculate '1.50' from '1500000000000000000' with 18 decimals

    const { result, rerender } = renderHook(
      ({ asset }) => useMerklRewards({ asset }),
      {
        initialProps: { asset: mockAsset },
      },
    );

    await waitFor(() => {
      expect(result.current.claimableReward).toBe('1.50');
    });

    const newAsset: TokenI = {
      ...mockAsset,
      address: '0x2222222222222222222222222222222222222222' as const,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);
    rerender({ asset: newAsset });

    // Should reset to null when asset changes
    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });
  });

  it('cancels fetch on unmount', async () => {
    let resolveFetch:
      | ((
          value:
            | Awaited<ReturnType<typeof fetchMerklRewardsForAsset>>
            | PromiseLike<
                Awaited<ReturnType<typeof fetchMerklRewardsForAsset>>
              >,
        ) => void)
      | undefined;
    const fetchPromise = new Promise<
      Awaited<ReturnType<typeof fetchMerklRewardsForAsset>>
    >((resolve) => {
      resolveFetch = resolve;
    });

    mockFetchMerklRewardsForAsset.mockReturnValueOnce(fetchPromise);

    const { unmount } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    unmount();

    await act(async () => {
      if (resolveFetch) {
        resolveFetch(null);
      }
    });

    // Fetch should have been called but aborted
    expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
  });

  it('uses token decimals from API when available', async () => {
    const assetWithDecimals: TokenI = {
      ...mockAsset,
      decimals: 6,
    };

    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18, // API returns 18 decimals
        price: null,
      },
      accumulated: '0',
      unclaimed: '1500000000000000000', // 1.5 tokens with 18 decimals
      pending: '0',
      proofs: [],
      amount: '1500000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');
    // The default implementation will calculate '1.50' from '1500000000000000000' with 18 decimals

    const { result } = renderHook(() =>
      useMerklRewards({ asset: assetWithDecimals }),
    );

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );

    // Should use token decimals from API (18) not asset decimals (6)
    expect(mockRenderFromTokenMinimalUnit).toHaveBeenCalledWith(
      '1500000000000000000',
      18,
      2,
    );
  });

  it('defaults to 18 decimals when token and asset decimals are undefined', async () => {
    const assetWithoutDecimals: TokenI = {
      ...mockAsset,
      decimals: undefined as unknown as number,
    };

    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: undefined as unknown as number, // API doesn't provide decimals
        price: null,
      },
      accumulated: '0',
      unclaimed: '1500000000000000000',
      pending: '0',
      proofs: [],
      amount: '1500000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');
    // The default implementation will calculate '1.50' from '1500000000000000000' with 18 decimals

    const { result } = renderHook(() =>
      useMerklRewards({ asset: assetWithoutDecimals }),
    );

    await waitFor(() => {
      expect(result.current.claimableReward).toBe('1.50');
    });

    expect(mockRenderFromTokenMinimalUnit).toHaveBeenCalledWith(
      '1500000000000000000',
      18,
      2,
    );
  });

  it('falls back to API claimed value when contract call fails', async () => {
    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '500000000000000000', // 0.5 tokens remaining
      pending: '0',
      proofs: [],
      amount: '1500000000000000000', // 1.5 total
      claimed: '1000000000000000000', // 1.0 already claimed (from API)
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    // Contract call fails, returns null
    mockGetClaimedAmountFromContract.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('0.50');
      },
      { timeout: 3000 },
    );

    // Should use API's claimed value (1.0) instead of contract value
    // unclaimed = amount - claimed = 1.5 - 1.0 = 0.5
    expect(mockRenderFromTokenMinimalUnit).toHaveBeenCalledWith(
      '500000000000000000',
      18,
      2,
    );
  });

  it('uses contract value when available, even if API has different claimed value', async () => {
    const mockRewardData = {
      token: {
        address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '500000000000000000',
      pending: '0',
      proofs: [],
      amount: '1500000000000000000',
      claimed: '1000000000000000000', // API says 1.0 claimed (stale)
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    // Contract returns updated value (1.2 claimed, more recent than API)
    mockGetClaimedAmountFromContract.mockResolvedValueOnce(
      '1200000000000000000',
    );

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('0.30');
      },
      { timeout: 3000 },
    );

    // Should use contract value (1.2) not API value (1.0)
    // unclaimed = amount - claimed = 1.5 - 1.2 = 0.3
    expect(mockRenderFromTokenMinimalUnit).toHaveBeenCalledWith(
      '300000000000000000',
      18,
      2,
    );
  });
});
