import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useMerklClaim } from './useMerklClaim';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS, TransactionStatus } from '@metamask/transaction-controller';
import { RootState } from '../../../../../../reducers';
import Engine from '../../../../../../core/Engine';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

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

// Helper to create mock reward data
const createMockRewardData = (overrides?: {
  address?: string;
  chainId?: number;
  symbol?: string;
  amount?: string;
}) => [
  {
    rewards: [
      {
        token: {
          address:
            overrides?.address ?? '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
          chainId: overrides?.chainId ?? 1,
          symbol: overrides?.symbol ?? 'aglaMerkl',
          decimals: 18,
          price: null,
        },
        accumulated: '0',
        unclaimed: '0',
        pending: overrides?.amount ?? '1000000000000000000',
        proofs: [
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        ],
        amount: overrides?.amount ?? '1000000000000000000',
        claimed: '0',
        recipient: mockSelectedAddress,
      },
    ],
  },
];

const mockSubscribeOnceIf = Engine.controllerMessenger
  .subscribeOnceIf as jest.MockedFunction<
  typeof Engine.controllerMessenger.subscribeOnceIf
>;

// Helper to setup subscribeOnceIf mock with specific transaction status
const setupSubscribeOnceIfMock = (
  status: TransactionStatus,
  errorMessage?: string,
  txId = 'tx-123',
) => {
  mockSubscribeOnceIf.mockImplementation((_event, callback, predicate) => {
    const mockTxMeta = {
      id: txId,
      status,
      ...(errorMessage && { error: { message: errorMessage } }),
    };
    if (!predicate || predicate(mockTxMeta as never)) {
      // Use queueMicrotask for more predictable async behavior
      queueMicrotask(() => callback(mockTxMeta as never));
    }
    return undefined as never;
  });
};

describe('useMerklClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // Default: Mock subscribeOnceIf to simulate confirmed status
    setupSubscribeOnceIfMock(TransactionStatus.confirmed);

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
    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    expect(result.current.isClaiming).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.claimRewards).toBe('function');
  });

  it('sets error when no account is selected', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return null;
      }
      return undefined;
    });

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(result.current.error).toBe('No account or network selected');
    expect(result.current.isClaiming).toBe(false);
  });

  it('sets error when no network is selected', async () => {
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

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(result.current.error).toBe('No account or network selected');
    expect(result.current.isClaiming).toBe(false);
  });

  it('fetches rewards and submits transaction successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(result.current.isClaiming).toBe(false);
    expect(result.current.error).toBe(null);
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toContain(`chainId=${Number(CHAIN_IDS.MAINNET)}`);

    const txCall = mockAddTransaction.mock.calls[0][0];
    expect(txCall.from).toBe(mockSelectedAddress);
    expect(txCall.to).toBe('0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae');
    expect(txCall.data).toBeDefined();
  });

  it('handles API fetch error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.isClaiming).toBe(false);
    expect(result.current.error).toContain('Failed to fetch Merkl rewards');
  });

  it('handles no claimable rewards error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ rewards: [] }],
    });

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch {
        // Expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toBe('No claimable rewards found');
    expect(result.current.isClaiming).toBe(false);
  });

  it('handles no matching token in rewards', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        createMockRewardData({
          address: '0x1111111111111111111111111111111111111111',
          symbol: 'OTHER',
        }),
    });

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch {
        // Expected
      }
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toBe('No claimable rewards found');
    expect(result.current.isClaiming).toBe(false);
  });

  it('finds matching reward in second data array element', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        ...createMockRewardData({
          address: '0x1111111111111111111111111111111111111111',
          symbol: 'OTHER',
        }),
        createMockRewardData({ amount: '2500000000000000000' })[0],
      ],
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    await waitFor(() => expect(result.current.isClaiming).toBe(false));
    expect(mockAddTransaction.mock.calls[0][0].to).toBe(
      '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae',
    );
  });

  it('handles network error', async () => {
    const error = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch (claimError) {
        // Expected to throw
        expect(claimError).toBe(error);
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isClaiming).toBe(false);
  });

  it('sets isClaiming to true during claim process', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    // Start claim and capture promise - isClaiming becomes true synchronously
    let claimPromise: Promise<void> | undefined;
    act(() => {
      claimPromise = result.current.claimRewards() as unknown as Promise<void>;
    });

    // isClaiming should be true immediately after starting
    expect(result.current.isClaiming).toBe(true);

    // Wait for claim to complete
    await act(async () => {
      await claimPromise;
    });

    expect(result.current.isClaiming).toBe(false);
  });

  it('uses asset chainId for API fetch and transaction', async () => {
    const lineaAsset: TokenI = {
      ...mockAsset,
      chainId: CHAIN_IDS.LINEA_MAINNET,
      address: '0x1234567890123456789012345678901234567890' as const,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        createMockRewardData({
          address: '0x1234567890123456789012345678901234567890',
          chainId: Number(CHAIN_IDS.LINEA_MAINNET),
          symbol: 'mUSD',
        }),
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: lineaAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toContain(
      `chainId=${Number(CHAIN_IDS.LINEA_MAINNET)}`,
    );
    expect(mockAddTransaction.mock.calls[0][0].chainId).toBe(
      `0x${Number(CHAIN_IDS.LINEA_MAINNET).toString(16)}`,
    );
  });

  it('waits for transaction confirmation via subscribeOnceIf', async () => {
    const txId = 'tx-456';
    // Setup mock with matching transaction ID
    setupSubscribeOnceIfMock(TransactionStatus.confirmed, undefined, txId);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: txId },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    // Verify subscribeOnceIf was called with correct event
    expect(mockSubscribeOnceIf).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
      expect.any(Function),
    );

    // Verify the predicate filters by transaction ID
    const predicateFn = mockSubscribeOnceIf.mock.calls[0][2];
    expect(predicateFn({ id: txId })).toBe(true);
    expect(predicateFn({ id: 'different-tx' })).toBe(false);
  });

  it('handles transaction failure via subscribeOnceIf', async () => {
    // Override the default mock to simulate transaction failure
    setupSubscribeOnceIfMock(TransactionStatus.failed, 'Transaction reverted');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Transaction reverted');
    });
    expect(result.current.isClaiming).toBe(false);
  });

  it('handles transaction failure with default error message', async () => {
    // Override the default mock to simulate transaction failure without error message
    setupSubscribeOnceIfMock(TransactionStatus.failed);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      try {
        await result.current.claimRewards();
      } catch {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Transaction failed');
    });
    expect(result.current.isClaiming).toBe(false);
  });
});
