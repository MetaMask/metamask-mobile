import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import type { Provider } from '@metamask/ramps-controller';
import { useEnsureProviderForPayAsset } from './useEnsureProviderForPayAsset';
import { useEnsureProviderForAsset } from '../../../../UI/Ramp/hooks/useEnsureProviderForAsset';
import { useRampsController } from '../../../../UI/Ramp/hooks/useRampsController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';

jest.mock('../../../../UI/Ramp/hooks/useEnsureProviderForAsset', () => ({
  useEnsureProviderForAsset: jest.fn(),
}));
jest.mock('../../../../UI/Ramp/hooks/useRampsController', () => ({
  useRampsController: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useTransactionPayData');

const ARBITRUM_USDC_CAIP =
  'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

describe('useEnsureProviderForPayAsset', () => {
  const useEnsureProviderForAssetMock = jest.mocked(useEnsureProviderForAsset);
  const useRampsControllerMock = jest.mocked(useRampsController);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useRampsControllerMock.mockReturnValue({
      selectedProvider: null,
      paymentMethodsStatus: 'success',
      paymentMethodsFetching: false,
    } as unknown as ReturnType<typeof useRampsController>);
    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        chainId: '0xa4b1',
      },
    ] as unknown as ReturnType<typeof useTransactionPayRequiredTokens>);
  });

  it('is disabled for non-deposit transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx',
      type: TransactionType.simpleSend,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHook(() => useEnsureProviderForPayAsset());

    expect(useEnsureProviderForAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, assetId: undefined }),
    );
  });

  it('does not run for Money Account deposits (those use the locked route gate)', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx',
      type: TransactionType.moneyAccountDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHook(() => useEnsureProviderForPayAsset());

    expect(useEnsureProviderForAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('passes the primary required token CAIP id for perpsDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx',
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHook(() => useEnsureProviderForPayAsset());

    expect(useEnsureProviderForAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        assetId: ARBITRUM_USDC_CAIP,
      }),
    );
  });

  it('passes the primary required token CAIP id for predictDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx',
      type: TransactionType.predictDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHook(() => useEnsureProviderForPayAsset());

    expect(useEnsureProviderForAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        assetId: ARBITRUM_USDC_CAIP,
      }),
    );
  });

  it('marks the asset unavailable when the selected provider does not support it', () => {
    const wrongProvider = {
      id: 'wrong',
      supportedCryptoCurrencies: {},
    } as unknown as Provider;
    useRampsControllerMock.mockReturnValue({
      selectedProvider: wrongProvider,
      paymentMethodsStatus: 'success',
      paymentMethodsFetching: false,
    } as unknown as ReturnType<typeof useRampsController>);
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx',
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHook(() => useEnsureProviderForPayAsset());

    expect(useEnsureProviderForAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        isTokenUnavailable: true,
      }),
    );
  });

  it('does not mark unavailable while payment methods are still settling', () => {
    const wrongProvider = {
      id: 'wrong',
      supportedCryptoCurrencies: {},
    } as unknown as Provider;
    useRampsControllerMock.mockReturnValue({
      selectedProvider: wrongProvider,
      paymentMethodsStatus: 'success',
      paymentMethodsFetching: true,
    } as unknown as ReturnType<typeof useRampsController>);
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx',
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHook(() => useEnsureProviderForPayAsset());

    expect(useEnsureProviderForAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({ isTokenUnavailable: false }),
    );
  });

  it('passes a no-op onNoSupportingProvider so MM Pay does not jump into the Ramp navigator', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx',
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHook(() => useEnsureProviderForPayAsset());

    const call = useEnsureProviderForAssetMock.mock.calls[0][0];
    expect(call.onNoSupportingProvider).toBeDefined();
    expect(() => call.onNoSupportingProvider?.('any-asset-id')).not.toThrow();
  });
});
