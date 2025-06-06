import { renderHook, act } from '@testing-library/react-hooks';
import { useEditNonce } from './useEditNonce';
import { getNetworkNonce, updateTransaction } from '../../util/transaction-controller';
import { useTransactionMetadataRequest } from '../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('../../util/transaction-controller', () => ({
  getNetworkNonce: jest.fn(),
  updateTransaction: jest.fn(),
}));

jest.mock('../Views/confirmations/hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

describe('useEditNonce', () => {
  const mockTransactionMetadata = {
    id: 'tx-1',
    txParams: {
      from: '0x123456789',
      to: '0x0',
      data: '0x0',
    },
    networkClientId: 'network-1',
    status: 'unapproved',
    time: 0,
    type: 'transfer',
  } as unknown as TransactionMeta;

  let mockGetNetworkNonce: jest.Mock;
  let mockUpdateTransaction: jest.Mock;
  let mockUseTransactionMetadataRequest: jest.Mock;

  beforeEach(() => {
    mockGetNetworkNonce = getNetworkNonce as jest.Mock;
    mockUpdateTransaction = updateTransaction as jest.Mock;
    mockUseTransactionMetadataRequest = useTransactionMetadataRequest as jest.Mock;

    mockGetNetworkNonce.mockReset();
    mockUpdateTransaction.mockReset();
    mockUseTransactionMetadataRequest.mockReset();

    mockGetNetworkNonce.mockResolvedValue(42);
    mockUpdateTransaction.mockResolvedValue(undefined);
    mockUseTransactionMetadataRequest.mockReturnValue(mockTransactionMetadata);
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useEditNonce());

    expect(result.current.showNonceModal).toBe(false);
    expect(result.current.proposedNonce).toBe(0);
    expect(result.current.userSelectedNonce).toBe(0);
  });

  it('should not fetch nonce when transaction metadata is undefined', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    renderHook(() => useEditNonce());

    expect(mockGetNetworkNonce).not.toHaveBeenCalled();
    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it('should fetch network nonce when transaction metadata is available', async () => {
    // Use a resolved promise to ensure the getNetworkNonce completes
    mockGetNetworkNonce.mockImplementation(async () => Promise.resolve(42));

    const { result, waitForNextUpdate } = renderHook(() => useEditNonce());

    // Wait for the effect to run
    await waitForNextUpdate();

    expect(mockGetNetworkNonce).toHaveBeenCalledWith(
      { from: mockTransactionMetadata.txParams.from },
      mockTransactionMetadata.networkClientId
    );
    expect(result.current.proposedNonce).toBe(42);
    expect(result.current.userSelectedNonce).toBe(42);
  });

  it('should not update proposedNonce if it has already been set', async () => {
    let resolveFn1: (value: number) => void;
    const promise1 = new Promise<number>((resolve) => {
      resolveFn1 = resolve;
    });
    mockGetNetworkNonce.mockReturnValueOnce(promise1);

    const { result } = renderHook(() => useEditNonce());

    // Resolve the first call with 42
    act(() => {
      resolveFn1(42);
    });

    // Wait for the state to update
    await act(async () => {
      await Promise.resolve();
    });

    // Check initial state update happened
    expect(result.current.proposedNonce).toBe(42);
    expect(result.current.userSelectedNonce).toBe(42);

    // Setup a second promise for the subsequent call
    let resolveFn2: (value: number) => void;
    const promise2 = new Promise<number>((resolve) => {
      resolveFn2 = resolve;
    });
    mockGetNetworkNonce.mockReturnValueOnce(promise2);

    // Force re-render by changing props
    act(() => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        ...mockTransactionMetadata,
        id: 'different-id', // Change a property to trigger rerender
      } as unknown as TransactionMeta);
    });

    // Resolve the second call with a different value
    act(() => {
      resolveFn2(99);
    });

    // Wait for the state to update
    await act(async () => {
      await Promise.resolve();
    });

    // The proposedNonce should not have changed
    expect(result.current.proposedNonce).toBe(42);

    // Ensure getNetworkNonce was called twice
    expect(mockGetNetworkNonce).toHaveBeenCalledTimes(2);
  });

  it('should update transaction with userSelectedNonce when it changes', async () => {
    let resolveFn: (value: number) => void;
    const promise = new Promise<number>((resolve) => {
      resolveFn = resolve;
    });
    mockGetNetworkNonce.mockReturnValueOnce(promise);

    const { result } = renderHook(() => useEditNonce());

    // Resolve the getNetworkNonce promise
    act(() => {
      resolveFn(42);
    });

    // Wait for the state to update
    await act(async () => {
      await Promise.resolve();
    });

    // Verify initial state
    expect(result.current.proposedNonce).toBe(42);
    expect(result.current.userSelectedNonce).toBe(42);

    // Set up a mock implementation for updateTransaction
    let updateTransactionResolveFn: () => void;
    const updateTransactionPromise = new Promise<void>((resolve) => {
      updateTransactionResolveFn = resolve;
    });
    mockUpdateTransaction.mockReturnValueOnce(updateTransactionPromise);

    // Change the user selected nonce
    act(() => {
      result.current.setUserSelectedNonce(100);
    });

    // Wait for the updateTransaction to be called
    await act(async () => {
      await Promise.resolve();
    });

    // Verify updateTransaction was called with correct parameters
    expect(mockUpdateTransaction).toHaveBeenCalledWith(
      {
        ...mockTransactionMetadata,
        customNonceValue: '100',
      },
      mockTransactionMetadata.id
    );

    // Resolve the updateTransaction promise
    act(() => {
      updateTransactionResolveFn();
    });

    // Final state check
    expect(result.current.userSelectedNonce).toBe(100);
  });

  it('should not update transaction when transaction metadata is undefined', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHook(() => useEditNonce());

    act(() => {
      result.current.setUserSelectedNonce(100);
    });

    // Wait for any potential updates
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockUpdateTransaction).not.toHaveBeenCalled();
  });

  it('should correctly toggle the nonce modal', () => {
    const { result } = renderHook(() => useEditNonce());

    expect(result.current.showNonceModal).toBe(false);

    act(() => {
      result.current.setShowNonceModal(true);
    });

    expect(result.current.showNonceModal).toBe(true);

    act(() => {
      result.current.setShowNonceModal(false);
    });

    expect(result.current.showNonceModal).toBe(false);
  });
});
