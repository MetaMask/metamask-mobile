import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { useIsFiatPaymentAvailable } from './useIsFiatPaymentAvailable';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useHasNativeFiatProvider } from '../../../../UI/Ramp/hooks/useHasNativeFiatProvider';
import { useRegionHasFiatProvider } from '../../../../UI/Ramp/hooks/useRegionHasFiatProvider';
import { useMoneyAccountDepositAssetId } from '../../../../UI/Money/hooks/useMoneyAccountDepositAssetId';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('./useMMPayFiatConfig');
jest.mock('../../../../UI/Ramp/hooks/useRampsPaymentMethods');
jest.mock('../../../../UI/Ramp/hooks/useHasNativeFiatProvider');
jest.mock('../../../../UI/Ramp/hooks/useRegionHasFiatProvider');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountDepositAssetId');
jest.mock('../transactions/useTransactionMetadataRequest');

const MUSD_MONAD_ASSET_ID =
  'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da';

describe('useIsFiatPaymentAvailable', () => {
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
  const useRampsPaymentMethodsMock = jest.mocked(useRampsPaymentMethods);
  const useHasNativeFiatProviderMock = jest.mocked(useHasNativeFiatProvider);
  const useRegionHasFiatProviderMock = jest.mocked(useRegionHasFiatProvider);
  const useMoneyAccountDepositAssetIdMock = jest.mocked(
    useMoneyAccountDepositAssetId,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useHasNativeFiatProviderMock.mockReturnValue(true);
    useRegionHasFiatProviderMock.mockReturnValue(true);
    useMoneyAccountDepositAssetIdMock.mockReturnValue(MUSD_MONAD_ASSET_ID);

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
    useHasNativeFiatProviderMock.mockReturnValue(false);

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

  it('returns false for a Money deposit when no provider serves the deposit asset', () => {
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    // Region has a provider (native gate passes) but none serve the deposit asset.
    useRegionHasFiatProviderMock.mockReturnValue(false);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(false);
  });

  it('returns true for a Money deposit when a provider serves the deposit asset', () => {
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    useRegionHasFiatProviderMock.mockReturnValue(true);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(true);
  });

  it('does not apply the deposit-asset check to non-Money-deposit types (e.g. Perps)', () => {
    // Perps is enabled by default; even with no provider serving the Money
    // deposit asset, Perps fiat availability is unaffected.
    useRegionHasFiatProviderMock.mockReturnValue(false);

    const { result } = renderHook(() => useIsFiatPaymentAvailable());
    expect(result.current).toBe(true);
  });
});
