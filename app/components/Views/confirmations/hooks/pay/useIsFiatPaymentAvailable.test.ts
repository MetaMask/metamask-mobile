import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { useIsFiatPaymentAvailable } from './useIsFiatPaymentAvailable';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useHasFiatProvider } from '../../../../UI/Ramp/hooks/useHasFiatProvider';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('./useMMPayFiatConfig');
jest.mock('../../../../UI/Ramp/hooks/useRampsPaymentMethods');
jest.mock('../../../../UI/Ramp/hooks/useHasFiatProvider');
jest.mock('../transactions/useTransactionMetadataRequest');

describe('useIsFiatPaymentAvailable', () => {
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
  const useRampsPaymentMethodsMock = jest.mocked(useRampsPaymentMethods);
  const useHasFiatProviderMock = jest.mocked(useHasFiatProvider);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useHasFiatProviderMock.mockReturnValue(true);

    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.perpsDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });

    useRampsPaymentMethodsMock.mockReturnValue({
      paymentMethods: [{ id: 'apple-pay' }],
    } as unknown as ReturnType<typeof useRampsPaymentMethods>);

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
  });

  it('returns true when transaction type is enabled and payment methods exist', () => {
    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(true);
  });

  it('returns false when transaction type is not in enabledTransactionTypes', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.simpleSend,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns false when enabledTransactionTypes is empty', () => {
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns false when no payment methods exist', () => {
    useRampsPaymentMethodsMock.mockReturnValue({
      paymentMethods: [],
    } as unknown as ReturnType<typeof useRampsPaymentMethods>);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns false when no native provider serves the region', () => {
    useHasFiatProviderMock.mockReturnValue(false);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns false when transaction metadata is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns true for batch transaction with matching nested type', () => {
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.predictDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.predictDeposit }],
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(true);
  });
});
