import { renderHook } from '@testing-library/react-hooks';
import { useIsInternalConfirmation } from './useIsInternalConfirmation';
import { useTransactionBatchesMetadata } from './useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { MMM_ORIGIN } from '../../constants/confirmations';
import {
  TransactionBatchMeta,
  TransactionMeta,
} from '@metamask/transaction-controller';

// Mock the dependencies
jest.mock('./useTransactionBatchesMetadata');
jest.mock('./useTransactionMetadataRequest');

describe('useIsInternalConfirmation', () => {
  const mockUseTransactionBatchesMetadata =
    useTransactionBatchesMetadata as jest.MockedFunction<
      typeof useTransactionBatchesMetadata
    >;
  const mockUseTransactionMetadataRequest =
    useTransactionMetadataRequest as jest.MockedFunction<
      typeof useTransactionMetadataRequest
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when transactionMetadata origin matches MMM_ORIGIN', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      origin: MMM_ORIGIN,
    } as TransactionMeta);
    mockUseTransactionBatchesMetadata.mockReturnValue(undefined);

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(true);
  });

  it('should return true when transactionBatchesMetadata origin matches MMM_ORIGIN', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseTransactionBatchesMetadata.mockReturnValue({
      origin: MMM_ORIGIN,
    } as TransactionBatchMeta);

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(true);
  });

  it('should return true when both metadata origins match MMM_ORIGIN', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      origin: MMM_ORIGIN,
    } as TransactionMeta);
    mockUseTransactionBatchesMetadata.mockReturnValue({
      origin: MMM_ORIGIN,
    } as TransactionBatchMeta);

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(true);
  });

  it('should return false when neither metadata origin matches MMM_ORIGIN', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      origin: 'different-origin',
    } as TransactionMeta);
    mockUseTransactionBatchesMetadata.mockReturnValue({
      origin: 'another-origin',
    } as TransactionBatchMeta);

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(false);
  });

  it('should return false when both metadata are undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseTransactionBatchesMetadata.mockReturnValue(undefined);

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(false);
  });

  it('should return false when transactionMetadata has different origin and transactionBatchesMetadata is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      origin: 'external-origin',
    } as TransactionMeta);
    mockUseTransactionBatchesMetadata.mockReturnValue(undefined);

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(false);
  });

  it('should return false when transactionMetadata is undefined and transactionBatchesMetadata has different origin', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseTransactionBatchesMetadata.mockReturnValue({
      origin: 'external-origin',
    } as TransactionBatchMeta);

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(false);
  });

  it('should handle metadata objects without origin property', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({} as TransactionMeta);
    mockUseTransactionBatchesMetadata.mockReturnValue(
      {} as TransactionBatchMeta,
    );

    const { result } = renderHook(() => useIsInternalConfirmation());

    expect(result.current).toBe(false);
  });

  it('should handle mixed undefined and valid metadata', () => {
    // Test transactionMetadata undefined, transactionBatchesMetadata with MMM_ORIGIN
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseTransactionBatchesMetadata.mockReturnValue({
      origin: MMM_ORIGIN,
    } as TransactionBatchMeta);

    const { result: result1 } = renderHook(() => useIsInternalConfirmation());
    expect(result1.current).toBe(true);

    // Test transactionMetadata with MMM_ORIGIN, transactionBatchesMetadata undefined
    mockUseTransactionMetadataRequest.mockReturnValue({
      origin: MMM_ORIGIN,
    } as TransactionMeta);
    mockUseTransactionBatchesMetadata.mockReturnValue(undefined);

    const { result: result2 } = renderHook(() => useIsInternalConfirmation());
    expect(result2.current).toBe(true);
  });
});
