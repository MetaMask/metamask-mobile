import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useMerklClaim } from './useMerklClaim';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { TokenI } from '../../../../Tokens/types';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
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
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    TokenBalancesController: {
      updateBalances: jest.fn().mockResolvedValue(undefined),
    },
    TokenDetectionController: {
      detectTokens: jest.fn().mockResolvedValue(undefined),
    },
    AccountTrackerController: {
      refresh: jest.fn().mockResolvedValue(undefined),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn((chainId) => {
        // Mainnet chainId is '0x1'
        if (chainId === '0x1' || chainId === 1) {
          return 'mainnet';
        }
        return undefined;
      }),
    },
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockAddTransaction = addTransaction as jest.MockedFunction<
  typeof addTransaction
>;
const mockSubscribe = Engine.controllerMessenger
  .subscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.subscribe
>;
const mockUnsubscribe = Engine.controllerMessenger
  .unsubscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.unsubscribe
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

// Helper to create mock transaction meta
const createMockTransactionMeta = (
  id: string,
  status: TransactionStatus,
  overrides?: Partial<TransactionMeta>,
): TransactionMeta =>
  ({
    id,
    status,
    chainId: CHAIN_IDS.MAINNET,
    networkClientId: mockNetworkClientId,
    time: Date.now(),
    txParams: {} as TransactionMeta['txParams'],
    ...overrides,
  }) as unknown as TransactionMeta;

describe('useMerklClaim', () => {
  let transactionStatusUpdateCallbacks: (({
    transactionMeta,
  }: {
    transactionMeta: TransactionMeta;
  }) => void)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    transactionStatusUpdateCallbacks = [];

    // Mock subscribe to capture transactionStatusUpdated callbacks
    mockSubscribe.mockImplementation((event, callback) => {
      if (event === 'TransactionController:transactionStatusUpdated') {
        transactionStatusUpdateCallbacks.push(
          callback as ({
            transactionMeta,
          }: {
            transactionMeta: TransactionMeta;
          }) => void,
        );
      }
    });

    mockUnsubscribe.mockImplementation(() => {
      // No-op for tests
    });

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

    const mockTransactionId = 'tx-123';
    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: mockTransactionId },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));
    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    await waitFor(() => expect(mockAddTransaction).toHaveBeenCalled());

    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: createMockTransactionMeta(
            mockTransactionId,
            TransactionStatus.confirmed,
          ),
        });
      });
    });

    await claimPromise;

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

    const mockTransactionId = 'tx-123';
    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: mockTransactionId },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));
    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    await waitFor(() => expect(mockAddTransaction).toHaveBeenCalled());

    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: createMockTransactionMeta(
            mockTransactionId,
            TransactionStatus.confirmed,
          ),
        });
      });
    });

    await claimPromise;
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

    const mockTransactionId = 'tx-123';
    let resolveTransaction: ((value: unknown) => void) | undefined;
    const transactionPromise = new Promise<unknown>((resolve) => {
      resolveTransaction = resolve;
    });

    mockAddTransaction.mockReturnValueOnce({
      result: transactionPromise,
      transactionMeta: { id: mockTransactionId },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    act(() => {
      result.current.claimRewards();
    });

    expect(result.current.isClaiming).toBe(true);

    await act(async () => {
      resolveTransaction?.('0xabc123');
      await transactionPromise;
    });

    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: createMockTransactionMeta(
            mockTransactionId,
            TransactionStatus.confirmed,
          ),
        });
      });
    });

    await waitFor(() => expect(result.current.isClaiming).toBe(false));
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

    const mockTransactionId = 'tx-123';
    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: mockTransactionId },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: lineaAsset }));
    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    await waitFor(() => expect(mockAddTransaction).toHaveBeenCalled());

    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: createMockTransactionMeta(
            mockTransactionId,
            TransactionStatus.confirmed,
            { chainId: CHAIN_IDS.LINEA_MAINNET },
          ),
        });
      });
    });

    await claimPromise;

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toContain(
      `chainId=${Number(CHAIN_IDS.LINEA_MAINNET)}`,
    );
    expect(mockAddTransaction.mock.calls[0][0].chainId).toBe(
      `0x${Number(CHAIN_IDS.LINEA_MAINNET).toString(16)}`,
    );
  });

  it('calls onClaimSuccess callback after transaction confirmation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    const mockTransactionId = 'tx-123';
    const mockOnClaimSuccess = jest.fn().mockResolvedValue(undefined);

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: mockTransactionId },
    } as never);

    const { result } = renderHook(() =>
      useMerklClaim({ asset: mockAsset, onClaimSuccess: mockOnClaimSuccess }),
    );

    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    await waitFor(() => expect(mockAddTransaction).toHaveBeenCalled());
    expect(mockOnClaimSuccess).not.toHaveBeenCalled();

    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: createMockTransactionMeta(
            mockTransactionId,
            TransactionStatus.confirmed,
          ),
        });
      });
    });

    await claimPromise;
    await waitFor(() => expect(mockOnClaimSuccess).toHaveBeenCalledTimes(1));
  });

  it.each([
    [
      'failure',
      TransactionStatus.failed,
      { error: { name: 'Error', message: 'Transaction reverted' } },
      'Transaction reverted',
    ],
    [
      'rejection',
      TransactionStatus.rejected,
      {},
      'Transaction failed or was rejected',
    ],
  ])(
    'handles transaction %s',
    async (_, status, metaOverrides, expectedError) => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => createMockRewardData(),
      });

      const mockTransactionId = 'tx-123';
      mockAddTransaction.mockResolvedValueOnce({
        result: Promise.resolve('0xabc123'),
        transactionMeta: { id: mockTransactionId },
      } as never);

      const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

      const claimPromise = act(async () => {
        try {
          await result.current.claimRewards();
        } catch {
          // Expected
        }
      });

      await waitFor(() => expect(mockAddTransaction).toHaveBeenCalled());

      await act(async () => {
        transactionStatusUpdateCallbacks.forEach((callback) => {
          callback({
            transactionMeta: createMockTransactionMeta(
              mockTransactionId,
              status,
              metaOverrides,
            ),
          });
        });
      });

      await claimPromise;
      await waitFor(() => expect(result.current.isClaiming).toBe(false));
      expect(result.current.error).toBe(expectedError);
    },
  );

  it('calls TokenBalancesController.updateBalances and AccountTrackerController.refresh on transaction confirmation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    const mockTransactionId = 'tx-123';
    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: mockTransactionId },
    } as never);

    const mockUpdateBalances = Engine.context.TokenBalancesController
      .updateBalances as jest.MockedFunction<
      typeof Engine.context.TokenBalancesController.updateBalances
    >;
    const mockRefresh = Engine.context.AccountTrackerController
      .refresh as jest.MockedFunction<
      typeof Engine.context.AccountTrackerController.refresh
    >;

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    await waitFor(() => expect(mockAddTransaction).toHaveBeenCalled());

    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: createMockTransactionMeta(
            mockTransactionId,
            TransactionStatus.confirmed,
          ),
        });
      });
    });

    await claimPromise;
    await waitFor(() =>
      expect(mockUpdateBalances).toHaveBeenCalledWith({
        chainIds: [CHAIN_IDS.MAINNET],
      }),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledWith(['mainnet']));
  });
});
