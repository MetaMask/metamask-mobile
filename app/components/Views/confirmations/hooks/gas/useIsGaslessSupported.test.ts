import { TransactionMeta } from '@metamask/transaction-controller';
import { waitFor } from '@testing-library/react-native';
import { merge } from 'lodash';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { isAtomicBatchSupported } from '../../../../../util/transaction-controller';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import { transferTransactionStateMock } from '../../__mocks__/transfer-transaction-mock';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from './useIsGaslessSupported';

jest.mock('../../../../../util/transactions/sentinel-api');
jest.mock('../../../../../util/transaction-controller');
jest.mock('../../../../../util/transactions/transaction-relay');
jest.mock('../transactions/useTransactionMetadataRequest');

const SMART_TRANSACTIONS_ENABLED_STATE = {
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
};

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
    isRelaySupportedMock.mockResolvedValue(false);
    isAtomicBatchSupportedMock.mockResolvedValue([]);
    isSendBundleSupportedMock.mockResolvedValue(false);
  });

  describe('Gasless Smart Transactions', () => {
    it('returns isSupported and isSmartTransaction as true', async () => {
      const stateWithSmartTransactionEnabled = merge(
        {},
        transferConfirmationState,
        SMART_TRANSACTIONS_ENABLED_STATE,
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

    it('returns isSupported and isSmartTransaction as false when smart transactions are disabled', async () => {
      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state: transferTransactionStateMock,
      });

      await waitFor(() =>
        expect(result.current).toEqual({
          isSupported: false,
          isSmartTransaction: false,
        }),
      );
    });

    it('returns false if smart transaction is enabled but sendBundle is not supported', async () => {
      isSendBundleSupportedMock.mockResolvedValue(false);

      const stateWithSmartTransactionEnabled = merge(
        {},
        transferConfirmationState,
        SMART_TRANSACTIONS_ENABLED_STATE,
      );

      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state: stateWithSmartTransactionEnabled,
      });

      await waitFor(() =>
        expect(result.current).toEqual({
          isSupported: false,
          isSmartTransaction: true,
        }),
      );
    });
  });

  describe('Gasless EIP-7702', () => {
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

  describe('Edge Cases', () => {
    it('returns isSupported and isSmartTransaction as false when chainId is undefined', async () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state: transferTransactionStateMock,
      });

      await waitFor(() =>
        expect(result.current).toEqual({
          isSupported: false,
          isSmartTransaction: false,
        }),
      );
    });

    it('returns isSupported and isSmartTransaction as false when transactionMeta is null', async () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state: transferTransactionStateMock,
      });

      await waitFor(() =>
        expect(result.current).toEqual({
          isSupported: false,
          isSmartTransaction: false,
        }),
      );
    });
  });
});
