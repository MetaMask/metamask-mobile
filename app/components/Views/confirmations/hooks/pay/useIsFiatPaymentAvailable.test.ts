import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { useIsFiatPaymentAvailable } from './useIsFiatPaymentAvailable';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useRampsProviders } from '../../../../UI/Ramp/hooks/useRampsProviders';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('./useMMPayFiatConfig');
jest.mock('../../../../UI/Ramp/hooks/useRampsPaymentMethods');
jest.mock('../../../../UI/Ramp/hooks/useRampsProviders');
jest.mock('../transactions/useTransactionMetadataRequest');

describe('useIsFiatPaymentAvailable', () => {
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
  const useRampsPaymentMethodsMock = jest.mocked(useRampsPaymentMethods);
  const useRampsProvidersMock = jest.mocked(useRampsProviders);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const transakNativeProvider = {
    id: '/providers/transak-native',
    name: 'Transak',
  };

  const transakAggregatorProvider = {
    id: '/providers/transak',
    name: 'Transak',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.perpsDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });

    useRampsPaymentMethodsMock.mockReturnValue({
      paymentMethods: [{ id: 'apple-pay' }],
    } as unknown as ReturnType<typeof useRampsPaymentMethods>);

    useRampsProvidersMock.mockReturnValue({
      providers: [transakNativeProvider],
      selectedProvider: transakNativeProvider,
    } as unknown as ReturnType<typeof useRampsProviders>);

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

  it('returns false when transaction metadata is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns false when payment methods are for Transak aggregator only', () => {
    useRampsProvidersMock.mockReturnValue({
      providers: [transakAggregatorProvider],
      selectedProvider: transakAggregatorProvider,
    } as unknown as ReturnType<typeof useRampsProviders>);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns false when selected Transak Native provider is stale for the current region', () => {
    useRampsProvidersMock.mockReturnValue({
      providers: [transakAggregatorProvider],
      selectedProvider: transakNativeProvider,
    } as unknown as ReturnType<typeof useRampsProviders>);

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
