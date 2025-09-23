import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from './useIsGaslessSupported';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../__mocks__/transfer-transaction-mock';
import { isSendBundleSupported } from '../../../../../core/RPCMethods/sentinel-api';
import { isAtomicBatchSupported } from '../../../../../util/transaction-controller';
import { isRelaySupported } from '../../../../../core/RPCMethods/transaction-relay';
import { merge } from 'lodash';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { waitFor } from '@testing-library/react-native';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('../../../../../core/RPCMethods/sentinel-api');
jest.mock('../../../../../util/transaction-controller');
jest.mock('../../../../../core/RPCMethods/transaction-relay');
jest.mock('../transactions/useTransactionMetadataRequest');

describe('useIsGaslessSupported', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const isSendBundleSupportedMock = jest.mocked(isSendBundleSupported);
  const isAtomicBatchSupportedMock = jest.mocked(isAtomicBatchSupported);
  const isRelaySupportedMock = jest.mocked(isRelaySupported);

  beforeEach(() => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { from: '0x123', to: '0xabc' },
    } as unknown as TransactionMeta);
    jest.clearAllMocks();
    isRelaySupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([]);
    isSendBundleSupportedMock.mockResolvedValue(false);
  });

  describe('when gasless supported', () => {
    it('returns isSupported and isSmartTransaction as true', async () => {
      const stateWithSmartTransactionEnabled = merge(
        {},
        transferConfirmationState,
        {
          swaps: {
            featureFlags: {
              smart_transactions: {
                mobile_active: true,
                extension_active: true,
              },
              smartTransactions: {
                mobileActive: true,
                extensionActive: true,
                mobileActiveIOS: true,
                mobileActiveAndroid: true,
              },
            },
            '0x1': {
              isLive: true,
              featureFlags: {
                smartTransactions: {
                  expectedDeadline: 45,
                  maxDeadline: 160,
                  mobileReturnTxHashAsap: false,
                  mobileActive: true,
                  extensionActive: true,
                  mobileActiveIOS: true,
                  mobileActiveAndroid: true,
                },
              },
            },
          },
        },
      );
      isSendBundleSupportedMock.mockResolvedValue(true);
      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state: stateWithSmartTransactionEnabled,
      });
      await waitFor(() =>
        expect(result.current).toEqual({
          isSupported: true,
          isSmartTransaction: true,
        }),
      );
    });
  });

  it('returns isSupported and isSmartTransaction as false when smart transactions are disabled', () => {
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state: transferTransactionStateMock,
    });
    expect(result.current).toEqual({
      isSupported: false,
      isSmartTransaction: false,
    });
  });
  it('returns isSupported and isSmartTransaction as false when chainId is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state: transferTransactionStateMock,
    });
    expect(result.current).toEqual({
      isSupported: false,
      isSmartTransaction: false,
    });
  });
  it('returns isSupported and isSmartTransaction as false when transactionMeta is null', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state: transferTransactionStateMock,
    });
    expect(result.current).toEqual({
      isSupported: false,
      isSmartTransaction: false,
    });
  });

  it('returns isSupported true and isSmartTransaction: false when EIP-7702 conditions met', async () => {
    isRelaySupportedMock.mockResolvedValue(true);
    isSendBundleSupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([
      {
        chainId: '0x1',
        isSupported: true,
        delegationAddress: '0xde1',
      },
    ]);

    const state = merge({}, transferTransactionStateMock);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        isSupported: true,
        isSmartTransaction: false,
      });
    });
  });

  it('returns isSupported false and isSmartTransaction: false when atomicBatchSupported account not upgraded', async () => {
    isRelaySupportedMock.mockResolvedValue(true);
    isSendBundleSupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([
      {
        chainId: '0x1',
        isSupported: false,
        delegationAddress: undefined,
      },
    ]);

    const state = merge({}, transferTransactionStateMock);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        isSupported: false,
        isSmartTransaction: false,
      });
    });
  });

  it('returns isSupported false and isSmartTransaction: false when relay not supported', async () => {
    isRelaySupportedMock.mockResolvedValue(false);
    isSendBundleSupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([
      {
        chainId: '0x1',
        isSupported: true,
        delegationAddress: '0xde1',
      },
    ]);

    const state = merge({}, transferTransactionStateMock);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        isSupported: false,
        isSmartTransaction: false,
      });
    });
  });

  it('returns isSupported false if the transaction is contract deployment (no "to" param)', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { from: '0x123' }, // no "to"
    } as unknown as TransactionMeta);
    isRelaySupportedMock.mockResolvedValue(true);
    isSendBundleSupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([
      {
        chainId: '0x1',
        isSupported: true,
        delegationAddress: '0xde1',
      },
    ]);

    const state = merge({}, transferTransactionStateMock);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        isSupported: false,
        isSmartTransaction: false,
      });
    });
  });

  it('returns isSupported false and isSmartTransaction: false when no matching chain support in atomicBatch', async () => {
    isRelaySupportedMock.mockResolvedValue(true);
    isSendBundleSupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([
      {
        chainId: '0x3',
        isSupported: true,
        delegationAddress: '0xde1',
      },
    ]);

    const state = merge({}, transferTransactionStateMock);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        isSupported: false,
        isSmartTransaction: false,
      });
    });
  });

  it('returns isSupported false and isSmartTransaction: false if isAtomicBatchSupported returns undefined', async () => {
    isRelaySupportedMock.mockResolvedValue(true);
    isSendBundleSupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue(
      undefined as unknown as ReturnType<typeof isAtomicBatchSupported>,
    );
    const state = merge({}, transferTransactionStateMock);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        isSupported: false,
        isSmartTransaction: false,
      });
    });
  });

  it('returns isSupported false and isSmartTransaction: false if isRelaySupported returns undefined', async () => {
    isRelaySupportedMock.mockResolvedValue(
      undefined as unknown as ReturnType<typeof isRelaySupported>,
    );
    isSendBundleSupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([
      {
        chainId: '0x1',
        isSupported: true,
        delegationAddress: '0xde1',
      },
    ]);
    const state = merge({}, transferTransactionStateMock);
    const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
      state,
    });
    await waitFor(() => {
      expect(result.current).toEqual({
        isSupported: false,
        isSmartTransaction: false,
      });
    });
  });
});
