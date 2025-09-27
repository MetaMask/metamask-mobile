import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useIsGaslessSupported } from './useIsGaslessSupported';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../__mocks__/transfer-transaction-mock';
import { isSendBundleSupported } from '../../../../../core/RPCMethods/sentinel-api';
import { merge } from 'lodash';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { waitFor } from '@testing-library/react-native';

jest.mock('../../../../../core/RPCMethods/sentinel-api');

jest.mock('../transactions/useTransactionMetadataRequest');

describe('useIsGaslessSupported', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const isSendBundleSupportedMock = jest.mocked(isSendBundleSupported);

  beforeEach(() => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
    } as unknown as ReturnType<typeof useTransactionMetadataRequest>);
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
