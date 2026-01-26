import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { isEligibleForMerklRewards, useMerklRewards } from './useMerklRewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../util/number', () => ({
  renderFromTokenMinimalUnit: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockRenderFromTokenMinimalUnit =
  renderFromTokenMinimalUnit as jest.MockedFunction<
    typeof renderFromTokenMinimalUnit
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
    (global.fetch as jest.Mock).mockClear();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      return undefined;
    });

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

  it('returns null and does not fetch when asset is undefined', async () => {
    const { result } = renderHook(() => useMerklRewards({ asset: undefined }));

    await waitFor(() => {
      expect(result.current.claimableReward).toBe(null);
    });

    expect(global.fetch).not.toHaveBeenCalled();
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

    expect(global.fetch).not.toHaveBeenCalled();
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

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and sets claimableReward when eligible', async () => {
    const mockRewardData = [
      {
        rewards: [
          {
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('1.50');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `${mockSelectedAddress}/rewards?chainId=${Number(CHAIN_IDS.MAINNET)}&test=true`,
      ),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
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

    const mockRewardData = [
      {
        rewards: [
          {
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('1.50');

    const { result } = renderHook(() =>
      useMerklRewards({ asset: upperCaseAsset }),
    );

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('1.50');
      },
      { timeout: 3000 },
    );

    // Verify that &test=true is added even with different case address
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `${mockSelectedAddress}/rewards?chainId=${Number(CHAIN_IDS.MAINNET)}&test=true`,
      ),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('handles API errors gracefully', async () => {
    const error = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should remain null on error
    expect(result.current.claimableReward).toBe(null);
  });

  it('handles non-OK API responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(result.current.claimableReward).toBe(null);
  });

  it('handles empty rewards array', async () => {
    const mockRewardData = [
      {
        rewards: [],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(result.current.claimableReward).toBe(null);
  });

  it('handles no matching token in rewards', async () => {
    const mockRewardData = [
      {
        rewards: [
          {
            token: {
              address: '0x1111111111111111111111111111111111111111', // Different token
              chainId: 1,
              symbol: 'OTHER',
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should remain null when no matching token is found
    expect(result.current.claimableReward).toBe(null);
  });

  it('finds matching reward in second data array element', async () => {
    const mockRewardData = [
      {
        rewards: [
          {
            token: {
              address: '0x1111111111111111111111111111111111111111', // Different token
              chainId: 1,
              symbol: 'OTHER',
              decimals: 18,
              price: null,
            },
            accumulated: '0',
            unclaimed: '1000000000000000000',
            pending: '0',
            proofs: [],
            amount: '1000000000000000000',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
      {
        rewards: [
          {
            token: {
              address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898', // Matching token in second element
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('2.50');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(
      () => {
        expect(result.current.claimableReward).toBe('2.50');
      },
      { timeout: 3000 },
    );

    // Verify it found the reward in the second data array element
    expect(mockRenderFromTokenMinimalUnit).toHaveBeenCalledWith(
      '2500000000000000000',
      18,
      2,
    );
  });

  it('handles zero unclaimed amounts', async () => {
    const mockRewardData = [
      {
        rewards: [
          {
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
            amount: '0',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(result.current.claimableReward).toBe(null);
  });

  it('handles very small amounts that round to zero', async () => {
    const mockRewardData = [
      {
        rewards: [
          {
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('0.00');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should remain null when amount rounds to zero
    expect(result.current.claimableReward).toBe(null);
  });

  it('converts "< 0.00001" to "< 0.01" for small amounts', async () => {
    const mockRewardData = [
      {
        rewards: [
          {
            token: {
              address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    // renderFromTokenMinimalUnit returns "< 0.00001" for very small amounts
    mockRenderFromTokenMinimalUnit.mockReturnValue('< 0.00001');

    const { result } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    await waitFor(() => {
      // Should convert to "< 0.01" for consistency with 2 decimal places
      expect(result.current.claimableReward).toBe('< 0.01');
    });
  });

  it('resets claimableReward when switching assets', async () => {
    const mockRewardData1 = [
      {
        rewards: [
          {
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData1),
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('1.50');

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

    rerender({ asset: newAsset });

    // Should reset to null when asset changes
    expect(result.current.claimableReward).toBe(null);
  });

  it('cancels fetch on unmount', async () => {
    let resolveFetch:
      | ((value: Response | PromiseLike<Response>) => void)
      | undefined;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

    const { unmount } = renderHook(() => useMerklRewards({ asset: mockAsset }));

    unmount();

    await act(async () => {
      if (resolveFetch) {
        resolveFetch({
          ok: true,
          json: jest.fn().mockResolvedValue([{ rewards: [] }]),
        } as unknown as Response);
      }
    });

    // Fetch should have been called but aborted
    expect(global.fetch).toHaveBeenCalled();
  });

  it('uses token decimals from API when available', async () => {
    const assetWithDecimals: TokenI = {
      ...mockAsset,
      decimals: 6,
    };

    const mockRewardData = [
      {
        rewards: [
          {
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('1.50');

    const { result } = renderHook(() =>
      useMerklRewards({ asset: assetWithDecimals }),
    );

    await waitFor(() => {
      expect(result.current.claimableReward).toBe('1.50');
    });

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

    const mockRewardData = [
      {
        rewards: [
          {
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
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRewardData),
    });

    mockRenderFromTokenMinimalUnit.mockReturnValue('1.50');

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
});
