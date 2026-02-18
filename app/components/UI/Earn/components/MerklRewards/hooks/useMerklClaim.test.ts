import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useMerklClaim } from './useMerklClaim';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { RootState } from '../../../../../../reducers';

// Mock @metamask/transaction-controller to avoid import issues
jest.mock('@metamask/transaction-controller', () => ({
  CHAIN_IDS: {
    MAINNET: '0x1',
    LINEA_MAINNET: '0xe708',
  },
  TransactionType: {
    contractInteraction: 'contractInteraction',
  },
  WalletDevice: {
    MM_MOBILE: 'metamask_mobile',
  },
}));

// Mock musd constants
jest.mock('../../../constants/musd', () => ({
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {
    '0x1': '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    '0xe708': '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
}));

jest.mock('../../../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

// Mock merkl-client to bypass module-level cache
const mockFetchMerklRewardsForAsset = jest.fn();
jest.mock('../merkl-client', () => ({
  fetchMerklRewardsForAsset: (...args: unknown[]) =>
    mockFetchMerklRewardsForAsset(...args),
  clearMerklRewardsCache: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockAddTransaction = addTransaction as jest.MockedFunction<
  typeof addTransaction
>;
const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
const mockNetworkClientId = 'mainnet';
const mockEndpoint = {
  networkClientId: mockNetworkClientId,
  rpcUrl: 'https://mainnet.infura.io',
};

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

// Helper to create mock reward data (shape returned by fetchMerklRewardsForAsset)
const createMockRewardData = (overrides?: {
  address?: string;
  chainId?: number;
  symbol?: string;
  amount?: string;
}) => ({
  token: {
    address: overrides?.address ?? '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
    chainId: overrides?.chainId ?? 1,
    symbol: overrides?.symbol ?? 'aglaMerkl',
    decimals: 18,
    price: null,
  },
  pending: overrides?.amount ?? '1000000000000000000',
  proofs: [
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  ],
  amount: overrides?.amount ?? '1000000000000000000',
  claimed: '0',
  recipient: mockSelectedAddress,
});

describe('useMerklClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchMerklRewardsForAsset.mockReset();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      // Handle selectDefaultEndpointByChainId - when used with useSelector as:
      // (state) => selectDefaultEndpointByChainId(state, asset.chainId)
      if (typeof selector === 'function') {
        // Try calling it with a mock state to see if it's the selector function
        try {
          const result = selector({} as RootState);
          // If it returns an endpoint-like object, return it
          if (
            result &&
            typeof result === 'object' &&
            'networkClientId' in result
          ) {
            return result;
          }
        } catch {
          // Not a selector function, continue
        }
        // Check if this is the selector function pattern
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectDefaultEndpointByChainId')) {
          return mockEndpoint;
        }
      }
      return undefined;
    });
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useMerklClaim(mockAsset));

    expect(result.current.isClaiming).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.claimRewards).toBe('function');
  });

  it('sets error and returns undefined when no account is selected', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return null;
      }
      return undefined;
    });

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    let claimResult: unknown;
    await act(async () => {
      claimResult = await result.current.claimRewards();
    });

    expect(claimResult).toBeUndefined();
    expect(result.current.error).toBe('No account or network selected');
    expect(result.current.isClaiming).toBe(false);
  });

  it('sets error and returns undefined when no network is selected', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      // Handle selectDefaultEndpointByChainId returning null/undefined
      if (typeof selector === 'function') {
        const selectorStr = selector.toString();
        if (selectorStr.includes('selectDefaultEndpointByChainId')) {
          return null;
        }
      }
      return undefined;
    });

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    let claimResult: unknown;
    await act(async () => {
      claimResult = await result.current.claimRewards();
    });

    expect(claimResult).toBeUndefined();
    expect(result.current.error).toBe('No account or network selected');
    expect(result.current.isClaiming).toBe(false);
  });

  it('fetches rewards and submits transaction successfully', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(createMockRewardData());

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    let claimResult: { txHash: string } | undefined;
    await act(async () => {
      claimResult = await result.current.claimRewards();
    });

    // Transaction submitted successfully
    expect(claimResult?.txHash).toBe('0xabc123');
    // isClaiming is false after addTransaction resolves
    expect(result.current.isClaiming).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockFetchMerklRewardsForAsset).toHaveBeenCalledWith(
      mockAsset,
      mockSelectedAddress,
      expect.any(AbortSignal),
    );

    const txCall = mockAddTransaction.mock.calls[0][0];
    expect(txCall.from).toBe(mockSelectedAddress);
    expect(txCall.to).toBe('0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae');
    expect(txCall.data).toBeDefined();
  });

  it('sets error when API fetch fails', async () => {
    mockFetchMerklRewardsForAsset.mockRejectedValueOnce(
      new Error('Failed to fetch Merkl rewards: 500'),
    );

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(result.current.isClaiming).toBe(false);
    expect(result.current.error).toContain('Failed to fetch Merkl rewards');
  });

  it('sets error when no claimable rewards found', async () => {
    // fetchMerklRewardsForAsset returns null when no matching reward exists
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(result.current.error).toBe('No claimable rewards found');
    expect(result.current.isClaiming).toBe(false);
  });

  it('sets error and returns undefined on network failure', async () => {
    mockFetchMerklRewardsForAsset.mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    let claimResult: unknown;
    await act(async () => {
      claimResult = await result.current.claimRewards();
    });

    expect(claimResult).toBeUndefined();
    expect(result.current.error).toBe('Network error');
    expect(result.current.isClaiming).toBe(false);
  });

  it('sets isClaiming to true during claim process', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(createMockRewardData());

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    // Start claim and capture promise - isClaiming becomes true synchronously
    let claimPromise: Promise<{ txHash: string } | undefined> | undefined;
    act(() => {
      claimPromise = result.current.claimRewards();
    });

    // isClaiming should be true immediately after starting
    expect(result.current.isClaiming).toBe(true);

    // Wait for claim to complete (tx submitted)
    await act(async () => {
      await claimPromise;
    });

    // isClaiming is false after addTransaction resolves
    expect(result.current.isClaiming).toBe(false);
  });

  it('uses asset chainId for API fetch and transaction', async () => {
    const lineaAsset: TokenI = {
      ...mockAsset,
      chainId: CHAIN_IDS.LINEA_MAINNET,
      address: '0x1234567890123456789012345678901234567890' as const,
    };

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(
      createMockRewardData({
        address: '0x1234567890123456789012345678901234567890',
        chainId: Number(CHAIN_IDS.LINEA_MAINNET),
        symbol: 'mUSD',
      }),
    );

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim(lineaAsset));

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(mockFetchMerklRewardsForAsset).toHaveBeenCalledWith(
      lineaAsset,
      mockSelectedAddress,
      expect.any(AbortSignal),
    );
    expect(mockAddTransaction.mock.calls[0][0].chainId).toBe(
      `0x${Number(CHAIN_IDS.LINEA_MAINNET).toString(16)}`,
    );
  });

  it('always uses Linea chain ID for claims even when token.chainId is undefined', async () => {
    const rewardData = createMockRewardData();
    rewardData.token.chainId = undefined as unknown as number;
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(rewardData);

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    await act(async () => {
      await result.current.claimRewards();
    });

    // Claims always go to Linea mainnet
    expect(mockAddTransaction.mock.calls[0][0].chainId).toBe(
      `0x${Number(CHAIN_IDS.LINEA_MAINNET).toString(16)}`,
    );
  });

  it('returns transaction hash after successful submission', async () => {
    const expectedTxHash = '0xabc123';

    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(createMockRewardData());

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve(expectedTxHash),
      transactionMeta: { id: 'tx-456' },
    } as never);

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    let claimResult: { txHash: string } | undefined;
    await act(async () => {
      claimResult = await result.current.claimRewards();
    });

    // Verify transaction was submitted and hash returned
    expect(claimResult?.txHash).toBe(expectedTxHash);
    expect(result.current.isClaiming).toBe(false);
  });

  it('does not set error when user rejects the transaction (EIP-1193 code 4001)', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(createMockRewardData());

    // Create error with EIP-1193 user rejection code
    const userRejectionError = Object.assign(
      new Error('User rejected the request'),
      { code: 4001 },
    );
    mockAddTransaction.mockRejectedValueOnce(userRejectionError);

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch {
        // Expected to throw
      }
    });

    // Error should NOT be set for user rejection (code 4001)
    expect(result.current.error).toBe(null);
    expect(result.current.isClaiming).toBe(false);
  });

  it('sets error for non-user-rejection errors (no code 4001)', async () => {
    mockFetchMerklRewardsForAsset.mockResolvedValueOnce(createMockRewardData());

    // Error without code 4001 should set error state
    mockAddTransaction.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMerklClaim(mockAsset));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch {
        // Expected to throw
      }
    });

    // Error SHOULD be set for non-user-rejection errors
    expect(result.current.error).toBe('Network error');
    expect(result.current.isClaiming).toBe(false);
  });

  describe('undefined asset handling', () => {
    it('initializes with correct default values when asset is undefined', () => {
      const { result } = renderHook(() => useMerklClaim(undefined));

      expect(result.current.isClaiming).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.claimRewards).toBe('function');
    });

    it('sets error and returns undefined when claimRewards is called with undefined asset', async () => {
      const { result } = renderHook(() => useMerklClaim(undefined));

      let claimResult: unknown;
      await act(async () => {
        claimResult = await result.current.claimRewards();
      });

      expect(claimResult).toBeUndefined();
      expect(result.current.error).toBe('No asset available for claiming');
      expect(result.current.isClaiming).toBe(false);
    });
  });

  describe('isClaiming reset after addTransaction', () => {
    it('sets isClaiming to false after addTransaction resolves (before waiting for tx hash)', async () => {
      mockFetchMerklRewardsForAsset.mockResolvedValueOnce(
        createMockRewardData(),
      );

      // Create a deferred promise so we can control when result resolves
      let resolveResult!: (value: string) => void;
      const resultPromise = new Promise<string>((resolve) => {
        resolveResult = resolve;
      });

      mockAddTransaction.mockResolvedValueOnce({
        result: resultPromise,
        transactionMeta: { id: 'tx-123' },
      } as never);

      const { result } = renderHook(() => useMerklClaim(mockAsset));

      // Start claim
      let claimPromise: Promise<unknown>;
      act(() => {
        claimPromise = result.current.claimRewards();
      });

      // Wait for addTransaction to resolve (but result promise is still pending)
      await act(async () => {
        // Let microtasks flush so addTransaction resolves
        await Promise.resolve();
        await Promise.resolve();
      });

      // isClaiming should be false now — addTransaction resolved, setIsClaiming(false) was called
      expect(result.current.isClaiming).toBe(false);

      // Now resolve the tx hash
      await act(async () => {
        resolveResult('0xabc123');
        if (claimPromise) {
          await claimPromise;
        }
      });

      expect(result.current.isClaiming).toBe(false);
    });

    it('returns undefined and sets isClaiming to false when transactionMeta is undefined', async () => {
      mockFetchMerklRewardsForAsset.mockResolvedValueOnce(
        createMockRewardData(),
      );

      mockAddTransaction.mockResolvedValueOnce({
        result: Promise.resolve('0xabc123'),
        transactionMeta: undefined,
      } as never);

      const { result } = renderHook(() => useMerklClaim(mockAsset));

      let claimResult: unknown;
      await act(async () => {
        claimResult = await result.current.claimRewards();
      });

      expect(claimResult).toBeUndefined();
      expect(result.current.isClaiming).toBe(false);
    });
  });
});
