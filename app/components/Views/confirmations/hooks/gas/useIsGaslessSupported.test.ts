import { TransactionMeta } from '@metamask/transaction-controller';
import { waitFor } from '@testing-library/react-native';
import { merge } from 'lodash';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import { transferTransactionStateMock } from '../../__mocks__/transfer-transaction-mock';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from './useIsGaslessSupported';
import { useGaslessSupportedSmartTransactions } from './useGaslessSupportedSmartTransactions';

jest.mock('../../../../../util/transactions/sentinel-api');
jest.mock('../../../../../util/transaction-controller');
jest.mock('../../../../../util/transactions/transaction-relay');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useGaslessSupportedSmartTransactions');

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
  const isRelaySupportedMock = jest.mocked(isRelaySupported);
  const useGaslessSupportedSmartTransactionsMock = jest.mocked(
    useGaslessSupportedSmartTransactions,
  );

  beforeEach(() => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
      txParams: { from: '0x123', to: '0xabc' },
    } as unknown as TransactionMeta);
    isRelaySupportedMock.mockResolvedValue(false);
    useGaslessSupportedSmartTransactionsMock.mockReturnValue({
      isSmartTransaction: false,
      isSupported: false,
      pending: false,
    });
  });

  describe('Gasless Smart Transactions', () => {
    it('returns isSupported and isSmartTransaction as true', async () => {
      const stateWithSmartTransactionEnabled = merge(
        {},
        transferConfirmationState,
        SMART_TRANSACTIONS_ENABLED_STATE,
      );
      useGaslessSupportedSmartTransactionsMock.mockReturnValue({
        isSmartTransaction: true,
        isSupported: true,
        pending: false,
      });

      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state: stateWithSmartTransactionEnabled,
      });

      await waitFor(() =>
        expect(result.current).toEqual({
          isSupported: true,
          isSmartTransaction: true,
          pending: false,
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
          pending: false,
        }),
      );
    });

    it('returns false if smart transaction is enabled but sendBundle is not supported', async () => {
      useGaslessSupportedSmartTransactionsMock.mockReturnValue({
        isSmartTransaction: true,
        isSupported: false,
        pending: false,
      });

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
          pending: false,
        }),
      );
    });
  });

  describe('Gasless EIP-7702', () => {
    it('returns isSupported true and isSmartTransaction: false when EIP-7702 conditions met', async () => {
      isRelaySupportedMock.mockResolvedValue(true);

      const state = merge({}, transferTransactionStateMock);
      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          isSupported: true,
          isSmartTransaction: false,
          pending: false,
        });
      });
    });

    it('returns isSupported false and isSmartTransaction: false when relay not supported', async () => {
      isRelaySupportedMock.mockResolvedValue(false);

      const state = merge({}, transferTransactionStateMock);
      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          isSupported: false,
          isSmartTransaction: false,
          pending: false,
        });
      });
    });

    it('returns isSupported false if the transaction is contract deployment (no "to" param)', async () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        chainId: '0x1',
        txParams: { from: '0x123' }, // no "to"
      } as unknown as TransactionMeta);
      isRelaySupportedMock.mockResolvedValue(true);

      const state = merge({}, transferTransactionStateMock);
      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          isSupported: false,
          isSmartTransaction: false,
          pending: false,
        });
      });
    });

    it('returns isSupported false and isSmartTransaction: false if isRelaySupported returns undefined', async () => {
      isRelaySupportedMock.mockResolvedValue(
        undefined as unknown as ReturnType<typeof isRelaySupported>,
      );

      const state = merge({}, transferTransactionStateMock);
      const { result } = renderHookWithProvider(() => useIsGaslessSupported(), {
        state,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          isSupported: false,
          isSmartTransaction: false,
          pending: false,
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
          pending: false,
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
          pending: false,
        }),
      );
    });
  });
});
