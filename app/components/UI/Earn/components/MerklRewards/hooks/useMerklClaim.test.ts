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
            pending: '1000000000000000000',
            proofs: [
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            ],
            amount: '1000000000000000000',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
    });

    const mockTransactionId = 'tx-123';
    const mockTransactionHash = '0xabc123';

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve(mockTransactionHash),
      transactionMeta: {
        id: mockTransactionId,
      },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    // Start the claim process
    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    // Wait for transaction submission
    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    // Simulate transaction confirmation
    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: {
            id: mockTransactionId,
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        });
      });
    });

    // Wait for claim to complete
    await claimPromise;

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    expect(result.current.isClaiming).toBe(false);
    expect(result.current.error).toBe(null);

    // Verify API was called with correct chainId (decimal format, not hex)
    const expectedDecimalChainId = Number(CHAIN_IDS.MAINNET);
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toContain(`chainId=${expectedDecimalChainId}`);

    const transactionCall = mockAddTransaction.mock.calls[0][0];
    expect(transactionCall.from).toBe(mockSelectedAddress);
    expect(transactionCall.to).toBe(
      '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae',
    );
    expect(transactionCall.data).toBeDefined();
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
    const mockRewardData = [
      {
        rewards: [],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
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

    expect(result.current.error).toBe('No claimable rewards found');
    expect(result.current.isClaiming).toBe(false);
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
            unclaimed: '1000000000000000000',
            pending: '0',
            proofs: [
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            ],
            amount: '1000000000000000000',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
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

    expect(result.current.error).toBe('No claimable rewards found');
    expect(result.current.isClaiming).toBe(false);
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
            proofs: [
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            ],
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
            proofs: [
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            ],
            amount: '2500000000000000000',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
    });

    const mockTransactionId = 'tx-123';
    const mockTransactionHash = '0xabc123';

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve(mockTransactionHash),
      transactionMeta: {
        id: mockTransactionId,
      },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    // Start the claim process
    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    // Wait for transaction submission
    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    // Simulate transaction confirmation
    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: {
            id: mockTransactionId,
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        });
      });
    });

    // Wait for claim to complete
    await claimPromise;

    await waitFor(() => {
      expect(result.current.isClaiming).toBe(false);
    });

    // Verify it found the reward in the second data array element and created transaction
    expect(mockAddTransaction).toHaveBeenCalled();
    const txParams = mockAddTransaction.mock.calls[0][0];
    expect(txParams.to).toBe('0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae');
    expect(txParams.data).toBeTruthy();
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
            pending: '1000000000000000000',
            proofs: [
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            ],
            amount: '1000000000000000000',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
    ];

    const mockTransactionId = 'tx-123';
    const mockTransactionHash = '0xabc123';
    let resolveTransaction: ((value: unknown) => void) | undefined;
    const transactionPromise = new Promise<unknown>((resolve) => {
      resolveTransaction = resolve;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
    });

    mockAddTransaction.mockReturnValueOnce({
      result: transactionPromise,
      transactionMeta: {
        id: mockTransactionId,
      },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    act(() => {
      result.current.claimRewards();
    });

    expect(result.current.isClaiming).toBe(true);

    await act(async () => {
      if (resolveTransaction) {
        resolveTransaction(mockTransactionHash);
      }
      await transactionPromise;
    });

    // Simulate transaction confirmation
    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: {
            id: mockTransactionId,
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        });
      });
    });

    await waitFor(() => {
      expect(result.current.isClaiming).toBe(false);
    });
  });

  it('uses asset chainId for API fetch and transaction', async () => {
    const lineaAsset: TokenI = {
      ...mockAsset,
      chainId: CHAIN_IDS.LINEA_MAINNET,
      address: '0x1234567890123456789012345678901234567890' as const, // Match test data
    };

    const mockRewardData = [
      {
        rewards: [
          {
            token: {
              address: '0x1234567890123456789012345678901234567890',
              chainId: Number(CHAIN_IDS.LINEA_MAINNET),
              symbol: 'mUSD',
              decimals: 18,
              price: null,
            },
            accumulated: '0',
            unclaimed: '0',
            pending: '1000000000000000000',
            proofs: [
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            ],
            amount: '1000000000000000000',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
    });

    const mockTransactionId = 'tx-123';
    const mockTransactionHash = '0xabc123';

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve(mockTransactionHash),
      transactionMeta: {
        id: mockTransactionId,
      },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: lineaAsset }));

    // Start the claim process
    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    // Wait for transaction submission
    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    // Simulate transaction confirmation
    await act(async () => {
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: {
            id: mockTransactionId,
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        });
      });
    });

    // Wait for claim to complete
    await claimPromise;

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Verify API was called with correct chainId (decimal format, not hex)
    const expectedDecimalChainId = Number(CHAIN_IDS.LINEA_MAINNET);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toContain(`chainId=${expectedDecimalChainId}`);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    // Verify transaction uses chainId from reward data
    const transactionCall = mockAddTransaction.mock.calls[0][0];
    expect(transactionCall.chainId).toBe(
      `0x${Number(CHAIN_IDS.LINEA_MAINNET).toString(16)}`,
    );
  });

  it('calls onClaimSuccess callback after transaction confirmation', async () => {
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
            pending: '1000000000000000000',
            proofs: [
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            ],
            amount: '1000000000000000000',
            claimed: '0',
            recipient: mockSelectedAddress,
          },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
    });

    const mockTransactionId = 'tx-123';
    const mockTransactionHash = '0xabc123';
    const mockOnClaimSuccess = jest.fn().mockResolvedValue(undefined);

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve(mockTransactionHash),
      transactionMeta: {
        id: mockTransactionId,
      },
    } as never);

    const { result } = renderHook(() =>
      useMerklClaim({
        asset: mockAsset,
        onClaimSuccess: mockOnClaimSuccess,
      }),
    );

    // Start the claim process
    const claimPromise = act(async () => {
      await result.current.claimRewards();
    });

    // Wait for transaction submission
    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    // Verify onClaimSuccess hasn't been called yet
    expect(mockOnClaimSuccess).not.toHaveBeenCalled();

    // Simulate transaction confirmation
    await act(async () => {
      // Trigger transactionStatusUpdated
      transactionStatusUpdateCallbacks.forEach((callback) => {
        callback({
          transactionMeta: {
            id: mockTransactionId,
            status: TransactionStatus.confirmed,
          } as TransactionMeta,
        });
      });
    });

    // Wait for claim to complete
    await claimPromise;

    // Verify onClaimSuccess was called after confirmation
    await waitFor(() => {
      expect(mockOnClaimSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
