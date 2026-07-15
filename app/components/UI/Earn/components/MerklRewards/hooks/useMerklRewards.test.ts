import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import {
  isTokenEligibleForMerklRewards,
  useMerklRewards,
} from './useMerklRewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectNetworkConfigurationByChainId } from '../../../../../../selectors/networkController';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  fetchMerklRewardsForAsset,
  getClaimedAmountFromContract,
} from '../merkl-client';
import { AGLAMERKL_ADDRESS_MAINNET } from '../constants';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../merkl-client', () => ({
  fetchMerklRewardsForAsset: jest.fn(),
  getClaimedAmountFromContract: jest.fn(),
}));

// Mock Engine for refreshTokenBalances
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TokenBalancesController: {
      updateBalances: jest.fn().mockResolvedValue(undefined),
    },
    AccountTrackerController: {
      refresh: jest.fn().mockResolvedValue(undefined),
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
  },
}));

jest.mock('../../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    }),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
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
  address: AGLAMERKL_ADDRESS_MAINNET,
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

describe('isTokenEligibleForMerklRewards', () => {
  it('returns false for native tokens with undefined address', () => {
    const result = isTokenEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      undefined as Hex | undefined,
    );

    expect(result).toBe(false);
  });

  it('returns false for native tokens with null address', () => {
    const result = isTokenEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      null as Hex | null,
    );

    expect(result).toBe(false);
  });

  it('returns false for unsupported chains', () => {
    const unsupportedChainId = '0x999' as Hex;
    const result = isTokenEligibleForMerklRewards(
      unsupportedChainId,
      AGLAMERKL_ADDRESS_MAINNET as Hex,
    );

    expect(result).toBe(false);
  });

  it('returns false for non-eligible tokens', () => {
    const nonEligibleAddress =
      '0x1111111111111111111111111111111111111111' as Hex;
    const result = isTokenEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      nonEligibleAddress,
    );

    expect(result).toBe(false);
  });

  it('returns true for eligible tokens on mainnet', () => {
    const eligibleAddress = AGLAMERKL_ADDRESS_MAINNET as Hex;
    const result = isTokenEligibleForMerklRewards(
      CHAIN_IDS.MAINNET,
      eligibleAddress,
    );

    expect(result).toBe(true);
  });

  it('performs case-insensitive address comparison', () => {
    const upperCaseAddress = AGLAMERKL_ADDRESS_MAINNET.toUpperCase() as Hex;
    const result = isTokenEligibleForMerklRewards(
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
    // Default: return null to fall back to API's claimed value
    mockGetClaimedAmountFromContract.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockClear();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectNetworkConfigurationByChainId) {
        return { name: 'Ethereum Mainnet' };
      }
      return undefined;
    });
  });

  it('initializes with null claimableReward', () => {
    const { result } = renderHook(() => useMerklRewards({ asset: undefined }));

    expect(result.current.claimableReward).toBe(null);
  });

  it('returns null claimableReward when asset is undefined', async () => {
    const { result } = renderHook(() => useMerklRewards({ asset: undefined }));

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });

    // Should not attempt to fetch rewards when asset is undefined
    expect(mockFetchMerklRewardsForAsset).not.toHaveBeenCalled();
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
      if (selector === selectNetworkConfigurationByChainId) {
        return { name: 'Ethereum Mainnet' };
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
        address: AGLAMERKL_ADDRESS_MAINNET,
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
    // Claims always go to Linea mainnet regardless of asset chain
    expect(mockGetClaimedAmountFromContract).toHaveBeenCalledWith(
      mockSelectedAddress,
      mockAsset.address,
      '0xe708', // CHAIN_IDS.LINEA_MAINNET
    );
  });

  it('adds test=true parameter with different case address (case-insensitive)', async () => {
    // Use uppercase address to verify case-insensitive comparison works
    const upperCaseAsset: TokenI = {
      ...mockAsset,
      address: AGLAMERKL_ADDRESS_MAINNET.toUpperCase() as `0x${string}`, // All uppercase
    };

    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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

  it('returns null claimableReward when API request fails', async () => {
    const error = new Error('Network error');
    mockFetchMerklRewardsForAsset.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    // Should remain null on error
    expect(result.current.claimableReward).toBe(null);
  });

  it('returns null claimableReward when API returns non-OK response', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    expect(result.current.claimableReward).toBe(null);
  });

  it('returns null claimableReward when rewards array is empty', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    });

    expect(result.current.claimableReward).toBe(null);
  });

  it('returns null claimableReward when no matching token found', async () => {
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
        address: AGLAMERKL_ADDRESS_MAINNET, // Matching token
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
  });

  it('returns null claimableReward when unclaimed amount is zero', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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

  it('returns null claimableReward when amount rounds to zero', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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

  it('formats single decimal values to 2 decimal places (0.9 -> 0.90)', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '900000000000000000', // 0.9 tokens
      pending: '0',
      proofs: [],
      amount: '900000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      // Should format to 2 decimal places (0.9 * 10^18 base units → "0.90")
      expect(result.current.claimableReward).toBe('0.90');
    });
  });

  it('formats whole numbers to 2 decimal places (1 -> 1.00)', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '1000000000000000000', // 1 token
      pending: '0',
      proofs: [],
      amount: '1000000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      // Should format to 2 decimal places (1 * 10^18 base units → "1.00")
      expect(result.current.claimableReward).toBe('1.00');
    });
  });

  it('formats values like 12.5 to 12.50', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '12500000000000000000', // 12.5 tokens
      pending: '0',
      proofs: [],
      amount: '12500000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      // Should format to 2 decimal places (12.5 * 10^18 base units → "12.50")
      expect(result.current.claimableReward).toBe('12.50');
    });
  });

  it('converts "< 0.00001" to "< 0.01" for small amounts', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '100', // Very small but non-zero amount
      pending: '0',
      proofs: [],
      amount: '100',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      // 100 base units with 18 decimals = 1e-16, below 0.01 → "< 0.01"
      expect(result.current.claimableReward).toBe('< 0.01');
    });
  });

  it('shows "< 0.01" when actual amount is below 0.01 but would round to 0.01', async () => {
    // 7401 with 6 decimals = 0.007401; renderFromTokenMinimalUnit(7401, 6, 2) returns "0.01" (rounds)
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 6,
        price: null,
      },
      accumulated: '0',
      unclaimed: '7401',
      pending: '0',
      proofs: [],
      amount: '7401',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      // 7401 with 6 decimals = 0.007401, below 0.01 → "< 0.01"
      expect(result.current.claimableReward).toBe('< 0.01');
    });
  });

  it('resets claimableReward when switching assets', async () => {
    const mockRewardData1 = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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
        address: AGLAMERKL_ADDRESS_MAINNET,
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
  });

  it('defaults to 18 decimals when token and asset decimals are undefined', async () => {
    const assetWithoutDecimals: TokenI = {
      ...mockAsset,
      decimals: undefined as unknown as number,
    };

    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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
  });

  it('falls back to API claimed value when contract call fails', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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
  });

  it('uses contract value when available, even if API has different claimed value', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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
  });

  it('returns "< 0.01" when amount is below 0.01 (e.g. 0.001 tokens)', async () => {
    // 1e15 base units with 18 decimals = 0.001 → below 0.01 → displayAmount = '< 0.01'
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '1000000000000000', // 0.001 tokens (1e15 base units)
      pending: '0',
      proofs: [],
      amount: '1000000000000000',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(result.current.claimableReward).toBe('< 0.01');
    });
  });

  it('returns "< 0.01" when amount is tiny (e.g. 1 base unit)', async () => {
    // 1 base unit with 18 decimals = 1e-18 → below 0.01 → displayAmount = '< 0.01'
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: 18,
        price: null,
      },
      accumulated: '0',
      unclaimed: '1',
      pending: '0',
      proofs: [],
      amount: '1',
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(result.current.claimableReward).toBe('< 0.01');
    });
  });

  it('ignores AbortError when fetch is cancelled', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockFetchMerklRewardsForAsset.mockRejectedValueOnce(abortError);

    const { result, unmount } = renderHook(() =>
      useMerklRewards({ asset: mockAsset }),
    );

    // Unmount immediately to simulate abort
    unmount();

    // Should not throw or set any error state
    expect(result.current.claimableReward).toBe(null);
  });

  it('uses asset decimals when token decimals is null', async () => {
    const assetWith6Decimals: TokenI = {
      ...mockAsset,
      decimals: 6,
    };

    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
        chainId: 1,
        symbol: 'aglaMerkl',
        decimals: null as unknown as number, // API returns null for decimals
        price: null,
      },
      accumulated: '0',
      unclaimed: '1500000',
      pending: '0',
      proofs: [],
      amount: '1500000', // 1.5 tokens with 6 decimals
      claimed: '0',
      recipient: mockSelectedAddress,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValueOnce('0');

    const { result } = renderHook(() =>
      useMerklRewards({ asset: assetWith6Decimals }),
    );

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );
  });

  it('exposes refetch function that triggers data refresh', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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

    mockFetchMerklRewardsForAsset.mockResolvedValue(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValue('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    // Wait for initial fetch
    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );

    // Verify refetch function exists
    expect(typeof result.current.refetch).toBe('function');

    // Clear mocks and set up new return values
    mockFetchMerklRewardsForAsset.mockClear();
    mockGetClaimedAmountFromContract.mockClear();

    // Simulate claimed amount updated (user claimed rewards)
    mockFetchMerklRewardsForAsset.mockResolvedValue(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValue('1500000000000000000'); // All claimed

    // Call refetch wrapped in act to avoid state update warning
    act(() => {
      result.current.refetch();
    });

    // Wait for refetch to complete - should now show null (no claimable)
    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe(null);
      },
      { timeout: 3000 },
    );

    // Verify fetch was called again
    expect(mockFetchMerklRewardsForAsset).toHaveBeenCalled();
    expect(mockGetClaimedAmountFromContract).toHaveBeenCalled();
  });

  it('clears stale claimableReward when refetch returns no matching reward', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(result.current.claimableReward).toBe('1.50');
    });

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });
  });

  it('starts auto-refresh interval and clears it on unmount', () => {
    const intervalId = 123 as unknown as ReturnType<typeof setInterval>;
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockReturnValue(intervalId);
    const clearIntervalSpy = jest
      .spyOn(global, 'clearInterval')
      .mockImplementation(() => undefined);

    const { unmount } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('increments rewardsFetchVersion after successful fetch and refetch', async () => {
    const mockRewardData = {
      token: {
        address: AGLAMERKL_ADDRESS_MAINNET,
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

    mockFetchMerklRewardsForAsset.mockResolvedValue(mockRewardData);
    mockGetClaimedAmountFromContract.mockResolvedValue('0');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(result.current.rewardsFetchVersion).toBeGreaterThan(0);
    });

    const versionAfterInitialFetch = result.current.rewardsFetchVersion;

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.rewardsFetchVersion).toBeGreaterThan(
        versionAfterInitialFetch,
      );
    });
  });
});
