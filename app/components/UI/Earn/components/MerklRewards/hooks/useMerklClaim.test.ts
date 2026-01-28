import { renderHook, act, waitFor } from '@testing-library/react-native';
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

// Store captured callbacks for simulating events
const capturedCallbacks: Record<
  string,
  {
    callback: (...args: unknown[]) => void;
    predicate: (...args: unknown[]) => boolean;
  }
> = {};

jest.mock('../../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribeOnceIf: jest.fn(
      (
        eventName: string,
        callback: (...args: unknown[]) => void,
        predicate: (...args: unknown[]) => boolean,
      ) => {
        capturedCallbacks[eventName] = { callback, predicate };
        return callback; // Return the handler (not an unsubscribe function)
      },
    ),
    tryUnsubscribe: jest.fn(),
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

describe('useMerklClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

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

  it('sets error and throws when no account is selected', async () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return null;
      }
      return undefined;
    });

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await expect(result.current.claimRewards()).rejects.toThrow(
        'No account or network selected',
      );
    });

    expect(result.current.error).toBe('No account or network selected');
    expect(result.current.isClaiming).toBe(false);
  });

  it('sets error and throws when no network is selected', async () => {
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
      await expect(result.current.claimRewards()).rejects.toThrow(
        'No account or network selected',
      );
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

    // isClaiming stays true until transaction confirms
    expect(result.current.isClaiming).toBe(true);

    // Simulate confirmation
    act(() => {
      const confirmedCallback =
        capturedCallbacks['TransactionController:transactionConfirmed'];
      if (confirmedCallback) {
        confirmedCallback.callback({ id: 'tx-123', status: 'confirmed' });
      }
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

  it('sets error when API fetch fails', async () => {
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

  it('throws error when no claimable rewards found', async () => {
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

  it('throws error when no matching token found in rewards', async () => {
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

    // isClaiming stays true until transaction confirms
    expect(result.current.isClaiming).toBe(true);

    // Simulate confirmation
    act(() => {
      const confirmedCallback =
        capturedCallbacks['TransactionController:transactionConfirmed'];
      if (confirmedCallback) {
        confirmedCallback.callback({ id: 'tx-123', status: 'confirmed' });
      }
    });

    expect(result.current.isClaiming).toBe(false);
    expect(mockAddTransaction.mock.calls[0][0].to).toBe(
      '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae',
    );
  });

  it('sets error and rethrows on network failure', async () => {
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

  it('sets isClaiming to true during claim process and stays true until transaction confirms', async () => {
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

    // Wait for claim to complete (tx submitted)
    await act(async () => {
      await claimPromise;
    });

    // isClaiming should STILL be true - waiting for transaction confirmation
    expect(result.current.isClaiming).toBe(true);

    // Simulate transaction confirmation event
    act(() => {
      const confirmedCallback =
        capturedCallbacks['TransactionController:transactionConfirmed'];
      if (confirmedCallback) {
        confirmedCallback.callback({ id: 'tx-123', status: 'confirmed' });
      }
    });

    // Now isClaiming should be false
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

  it('falls back to asset chainId when token.chainId is undefined', async () => {
    // Create reward data without chainId in token
    const rewardDataWithoutChainId = [
      {
        rewards: [
          {
            token: {
              address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898',
              chainId: undefined, // No chainId from API
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
      json: async () => rewardDataWithoutChainId,
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve('0xabc123'),
      transactionMeta: { id: 'tx-123' },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    // Should use asset.chainId as fallback (mainnet = 0x1)
    expect(mockAddTransaction.mock.calls[0][0].chainId).toBe(
      `0x${Number(CHAIN_IDS.MAINNET).toString(16)}`,
    );
  });

  it('returns transaction hash after submission and keeps loading until confirmation', async () => {
    const txId = 'tx-456';
    const expectedTxHash = '0xabc123';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockRewardData(),
    });

    mockAddTransaction.mockResolvedValueOnce({
      result: Promise.resolve(expectedTxHash),
      transactionMeta: { id: txId },
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    let claimResult: { txHash: string } | undefined;
    await act(async () => {
      claimResult = await result.current.claimRewards();
    });

    // Verify transaction was submitted and hash returned
    expect(claimResult?.txHash).toBe(expectedTxHash);
    // Loading stays true until transaction reaches terminal status
    expect(result.current.isClaiming).toBe(true);

    // Simulate confirmation
    act(() => {
      const confirmedCallback =
        capturedCallbacks['TransactionController:transactionConfirmed'];
      if (confirmedCallback) {
        confirmedCallback.callback({ id: txId, status: 'confirmed' });
      }
    });

    expect(result.current.isClaiming).toBe(false);
  });
});
