import { renderHook } from '@testing-library/react-hooks';
import { TransactionStatus } from '@metamask/transaction-controller';
import { usePendingMerklClaim } from './usePendingMerklClaim';
import { MERKL_CLAIM_ORIGIN } from '../constants';

// Mock the selector
const mockSelectTransactions = jest.fn();
jest.mock('../../../../../../selectors/transactionController', () => ({
  selectTransactions: (state: unknown) => mockSelectTransactions(state),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

describe('usePendingMerklClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const createMockTransaction = (
    overrides: {
      origin?: string;
      status?: TransactionStatus;
      id?: string;
    } = {},
  ) => ({
    id: overrides.id ?? 'tx-123',
    origin: overrides.origin ?? MERKL_CLAIM_ORIGIN,
    status: overrides.status ?? TransactionStatus.submitted,
    time: Date.now(),
    txParams: {
      from: '0x1234567890abcdef1234567890abcdef12345678',
      to: '0xabcdef1234567890abcdef1234567890abcdef12',
      value: '0x0',
      data: '0x',
    },
    chainId: '0x1',
  });

  it('returns hasPendingClaim as false when no transactions exist', () => {
    mockSelectTransactions.mockReturnValue([]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns hasPendingClaim as false when no merkl claim transactions exist', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({
        origin: 'other-origin',
        status: TransactionStatus.submitted,
      }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns hasPendingClaim as true when approved merkl claim transaction exists', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({ status: TransactionStatus.approved }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(true);
  });

  it('returns hasPendingClaim as true when signed merkl claim transaction exists', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({ status: TransactionStatus.signed }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(true);
  });

  it('returns hasPendingClaim as true when submitted merkl claim transaction exists', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({ status: TransactionStatus.submitted }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(true);
  });

  it('returns hasPendingClaim as false when merkl claim transaction is confirmed', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({ status: TransactionStatus.confirmed }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns hasPendingClaim as false when merkl claim transaction failed', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({ status: TransactionStatus.failed }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns hasPendingClaim as false when merkl claim transaction was dropped', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({ status: TransactionStatus.dropped }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns hasPendingClaim as false when merkl claim transaction is unapproved', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({ status: TransactionStatus.unapproved }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns hasPendingClaim as true when at least one in-flight merkl claim exists among multiple transactions', () => {
    mockSelectTransactions.mockReturnValue([
      createMockTransaction({
        id: 'tx-1',
        origin: 'other-origin',
        status: TransactionStatus.submitted,
      }),
      createMockTransaction({
        id: 'tx-2',
        status: TransactionStatus.confirmed,
      }),
      createMockTransaction({
        id: 'tx-3',
        status: TransactionStatus.submitted,
      }),
    ]);

    const { result } = renderHook(() => usePendingMerklClaim());

    expect(result.current.hasPendingClaim).toBe(true);
  });

  describe('onClaimConfirmed callback', () => {
    it('calls onClaimConfirmed when a pending claim becomes confirmed', () => {
      const onClaimConfirmed = jest.fn();
      const txId = 'tx-pending-to-confirmed';

      // Start with pending transaction
      mockSelectTransactions.mockReturnValue([
        createMockTransaction({
          id: txId,
          status: TransactionStatus.submitted,
        }),
      ]);

      const { rerender } = renderHook(() =>
        usePendingMerklClaim({ onClaimConfirmed }),
      );

      expect(onClaimConfirmed).not.toHaveBeenCalled();

      // Transaction becomes confirmed
      mockSelectTransactions.mockReturnValue([
        createMockTransaction({
          id: txId,
          status: TransactionStatus.confirmed,
        }),
      ]);

      rerender();

      expect(onClaimConfirmed).toHaveBeenCalledTimes(1);
    });

    it('does not call onClaimConfirmed when transaction was not previously tracked as pending', () => {
      const onClaimConfirmed = jest.fn();

      // Start with already confirmed transaction (not tracked as pending)
      mockSelectTransactions.mockReturnValue([
        createMockTransaction({
          id: 'tx-already-confirmed',
          status: TransactionStatus.confirmed,
        }),
      ]);

      renderHook(() => usePendingMerklClaim({ onClaimConfirmed }));

      expect(onClaimConfirmed).not.toHaveBeenCalled();
    });

    it('does not call onClaimConfirmed when a pending claim fails', () => {
      const onClaimConfirmed = jest.fn();
      const txId = 'tx-pending-to-failed';

      // Start with pending transaction
      mockSelectTransactions.mockReturnValue([
        createMockTransaction({
          id: txId,
          status: TransactionStatus.submitted,
        }),
      ]);

      const { rerender } = renderHook(() =>
        usePendingMerklClaim({ onClaimConfirmed }),
      );

      // Transaction fails
      mockSelectTransactions.mockReturnValue([
        createMockTransaction({
          id: txId,
          status: TransactionStatus.failed,
        }),
      ]);

      rerender();

      expect(onClaimConfirmed).not.toHaveBeenCalled();
    });

    it('does not call onClaimConfirmed when no callback is provided', () => {
      const txId = 'tx-no-callback';

      // Start with pending transaction
      mockSelectTransactions.mockReturnValue([
        createMockTransaction({
          id: txId,
          status: TransactionStatus.submitted,
        }),
      ]);

      const { rerender } = renderHook(() => usePendingMerklClaim());

      // Transaction becomes confirmed - should not throw
      mockSelectTransactions.mockReturnValue([
        createMockTransaction({
          id: txId,
          status: TransactionStatus.confirmed,
        }),
      ]);

      expect(() => rerender()).not.toThrow();
    });
  });
});
