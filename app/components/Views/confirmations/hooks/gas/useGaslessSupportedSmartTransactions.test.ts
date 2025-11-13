import { waitFor } from '@testing-library/react-native';
import { merge } from 'lodash';
import { useGaslessSupportedSmartTransactions } from './useGaslessSupportedSmartTransactions';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { transferTransactionStateMock } from '../../__mocks__/transfer-transaction-mock';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('../../../../../util/transactions/sentinel-api');
jest.mock('../../../../../selectors/smartTransactionsController');
jest.mock('../transactions/useTransactionMetadataRequest');

const CHAIN_ID_MOCK = '0x1';

describe('useGaslessSupportedSmartTransactions (mobile)', () => {
  const isSendBundleSupportedMock = jest.mocked(isSendBundleSupported);
  const selectShouldUseSmartTransactionMock = jest.mocked(
    selectShouldUseSmartTransaction,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    useTransactionMetadataRequestMock.mockReturnValue({
      chainId: CHAIN_ID_MOCK,
    } as unknown as TransactionMeta);

    isSendBundleSupportedMock.mockResolvedValue(false);
    selectShouldUseSmartTransactionMock.mockReturnValue(false);
  });

  it('returns isSupported = true when both smart transaction and bundle supported', async () => {
    isSendBundleSupportedMock.mockResolvedValue(true);
    selectShouldUseSmartTransactionMock.mockReturnValue(true);

    const { result } = renderHookWithProvider(
      () => useGaslessSupportedSmartTransactions(),
      {
        state: merge({}, transferConfirmationState),
      },
    );
    await waitFor(() =>
      expect(result.current).toStrictEqual({
        isSmartTransaction: true,
        isSupported: true,
        pending: false,
      }),
    );
  });

  it('returns isSupported = false when smart transaction enabled but bundle not supported', async () => {
    isSendBundleSupportedMock.mockResolvedValue(false);
    selectShouldUseSmartTransactionMock.mockReturnValue(true);

    const { result } = renderHookWithProvider(
      () => useGaslessSupportedSmartTransactions(),
      {
        state: merge({}, transferConfirmationState),
      },
    );
    await waitFor(() =>
      expect(result.current).toStrictEqual({
        isSmartTransaction: true,
        isSupported: false,
        pending: false,
      }),
    );
  });

  it('returns isSupported = false when bundle supported but not a smart transaction', async () => {
    isSendBundleSupportedMock.mockResolvedValue(true);
    selectShouldUseSmartTransactionMock.mockReturnValue(false);

    const { result } = renderHookWithProvider(
      () => useGaslessSupportedSmartTransactions(),
      {
        state: merge({}, transferConfirmationState),
      },
    );
    await waitFor(() =>
      expect(result.current).toStrictEqual({
        isSmartTransaction: false,
        isSupported: false,
        pending: false,
      }),
    );
  });

  it('returns isSupported = false when neither smart transaction nor bundle is supported', async () => {
    isSendBundleSupportedMock.mockResolvedValue(false);
    selectShouldUseSmartTransactionMock.mockReturnValue(false);

    const { result } = renderHookWithProvider(
      () => useGaslessSupportedSmartTransactions(),
      {
        state: merge({}, transferConfirmationState),
      },
    );
    await waitFor(() =>
      expect(result.current).toStrictEqual({
        isSmartTransaction: false,
        isSupported: false,
        pending: false,
      }),
    );
  });

  it('returns pending = true while sendBundleSupported is still pending', async () => {
    let resolvePromise: (value: boolean) => void = () => {
      // no-op
    };
    const pendingPromise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
    isSendBundleSupportedMock.mockReturnValue(
      pendingPromise as Promise<boolean>,
    );
    selectShouldUseSmartTransactionMock.mockReturnValue(true);

    const { result, rerender } = renderHookWithProvider(
      () => useGaslessSupportedSmartTransactions(),
      { state: merge({}, transferConfirmationState) },
    );
    expect(result.current.pending).toBe(true);

    // Resolve and trigger update
    resolvePromise(true);
    rerender(transferConfirmationState);
    await waitFor(() =>
      expect(result.current).toStrictEqual({
        isSmartTransaction: true,
        isSupported: true,
        pending: false,
      }),
    );
  });

  it('returns false if chainId is missing', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      chainId: undefined,
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(
      () => useGaslessSupportedSmartTransactions(),
      { state: transferTransactionStateMock },
    );
    await waitFor(() =>
      expect(result.current).toStrictEqual({
        isSmartTransaction: false,
        isSupported: false,
        pending: false,
      }),
    );
  });

  it('returns false if transactionMeta is null', async () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(
      () => useGaslessSupportedSmartTransactions(),
      { state: transferTransactionStateMock },
    );
    await waitFor(() =>
      expect(result.current).toStrictEqual({
        isSmartTransaction: false,
        isSupported: false,
        pending: false,
      }),
    );
  });
});
