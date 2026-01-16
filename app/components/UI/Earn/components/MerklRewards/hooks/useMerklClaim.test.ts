import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useMerklClaim } from './useMerklClaim';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectSelectedNetworkClientId } from '../../../../../../selectors/networkController';
import { TokenI } from '../../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockAddTransaction = addTransaction as jest.MockedFunction<
  typeof addTransaction
>;

const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
const mockNetworkClientId = 'mainnet';

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
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectSelectedNetworkClientId) {
        return mockNetworkClientId;
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
      if (selector === selectSelectedNetworkClientId) {
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

    mockAddTransaction.mockResolvedValueOnce({
      id: 'tx-123',
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

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
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`chainId=${expectedDecimalChainId}`),
    );

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

    let resolveTransaction: ((value: unknown) => void) | undefined;
    const transactionPromise = new Promise<unknown>((resolve) => {
      resolveTransaction = resolve;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardData,
    });

    mockAddTransaction.mockReturnValueOnce(transactionPromise as never);

    const { result } = renderHook(() => useMerklClaim({ asset: mockAsset }));

    act(() => {
      result.current.claimRewards();
    });

    expect(result.current.isClaiming).toBe(true);

    await act(async () => {
      if (resolveTransaction) {
        resolveTransaction({ id: 'tx-123' });
      }
      await transactionPromise;
    });

    await waitFor(() => {
      expect(result.current.isClaiming).toBe(false);
    });
  });

  it('uses asset chainId for API fetch and transaction', async () => {
    const lineaAsset: TokenI = {
      ...mockAsset,
      chainId: CHAIN_IDS.LINEA_MAINNET,
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
            proofs: ['0x1234'],
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

    mockAddTransaction.mockResolvedValueOnce({
      id: 'tx-123',
    } as never);

    const { result } = renderHook(() => useMerklClaim({ asset: lineaAsset }));

    await act(async () => {
      await result.current.claimRewards();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Verify API was called with correct chainId (decimal format, not hex)
    const expectedDecimalChainId = Number(CHAIN_IDS.LINEA_MAINNET);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`chainId=${expectedDecimalChainId}`),
    );

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    // Verify transaction uses chainId from reward data
    const transactionCall = mockAddTransaction.mock.calls[0][0];
    expect(transactionCall.chainId).toBe(
      `0x${Number(CHAIN_IDS.LINEA_MAINNET).toString(16)}`,
    );
  });
});
