import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useApprovalRequest from '../useApprovalRequest';
import { GO_BACK_TYPES, useTransactionConfirm } from './useTransactionConfirm';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { merge } from 'lodash';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import Routes from '../../../../../constants/navigation/Routes';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { useFullScreenConfirmation } from '../ui/useFullScreenConfirmation';
import { resetTransaction } from '../../../../../actions/transaction';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../../util/networks';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { flushPromises } from '../../../../../util/test/utils';
import { useSelectedGasFeeToken } from '../gas/useGasFeeToken';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { useAsyncResult as useAsyncResultHook } from '../../../../hooks/useAsyncResult';
import { act } from '@testing-library/react-hooks';
import { useTransactionPayQuotes } from '../pay/useTransactionPayData';
import { TransactionPayQuote } from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../useApprovalRequest');
jest.mock('./useTransactionMetadataRequest');
jest.mock('../../../../../selectors/smartTransactionsController');
jest.mock('../ui/useFullScreenConfirmation');
jest.mock('../../../../../actions/transaction');
jest.mock('../../../../../util/networks');
jest.mock('../../../../hooks/useNetworkEnablement/useNetworkEnablement');
jest.mock('../gas/useGasFeeToken');
jest.mock('../../../../hooks/useAsyncResult', () => ({
  useAsyncResult: jest.fn(),
}));
jest.mock('../../../../../util/transactions/sentinel-api');
jest.mock('../pay/useTransactionPayData');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const CHAIN_ID_MOCK = '0x123';

function renderHook() {
  return renderHookWithProvider(useTransactionConfirm, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('useTransactionConfirm', () => {
  const useApprovalRequestMock = jest.mocked(useApprovalRequest);
  const onApprovalConfirm = jest.fn();
  const useFullScreenConfirmationMock = jest.mocked(useFullScreenConfirmation);
  const resetTransactionMock = jest.mocked(resetTransaction);
  const useNetworkEnablementMock = jest.mocked(useNetworkEnablement);
  const useSelectedGasFeeTokenMock = jest.mocked(useSelectedGasFeeToken);
  const isSendBundleSupportedMock = jest.mocked(isSendBundleSupported);
  const useAsyncResultMock = jest.mocked(useAsyncResultHook);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);

  const isRemoveGlobalNetworkSelectorEnabledMock = jest.mocked(
    isRemoveGlobalNetworkSelectorEnabled,
  );

  const selectShouldUseSmartTransactionMock = jest.mocked(
    selectShouldUseSmartTransaction,
  );

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    useAsyncResultMock.mockReturnValue({ pending: false, value: false });

    useApprovalRequestMock.mockReturnValue({
      onConfirm: onApprovalConfirm,
    } as unknown as ReturnType<typeof useApprovalRequest>);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      chainId: CHAIN_ID_MOCK,
      origin: ORIGIN_METAMASK,
      txParams: {},
    } as unknown as TransactionMeta);

    selectShouldUseSmartTransactionMock.mockReturnValue(false);

    useFullScreenConfirmationMock.mockReturnValue({
      isFullScreenConfirmation: true,
    });

    resetTransactionMock.mockReturnValue({
      type: 'reset',
    });

    isRemoveGlobalNetworkSelectorEnabledMock.mockReturnValue(false);

    useNetworkEnablementMock.mockReturnValue({
      tryEnableEvmNetwork: jest.fn(),
    } as unknown as ReturnType<typeof useNetworkEnablement>);

    useTransactionPayQuotesMock.mockReturnValue([]);
  });

  it('confirms approval request', async () => {
    const { result } = renderHook();

    await result.current.onConfirm();

    expect(onApprovalConfirm).toHaveBeenCalled();
  });

  it('sets waitForResult true when not smart tx, no quotes, no fee token', async () => {
    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: true,
      }),
      expect.anything(),
    );
  });

  it('does not wait for result if smart transaction', async () => {
    selectShouldUseSmartTransactionMock.mockReturnValue(true);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: false,
      }),
      expect.anything(),
    );
  });

  it('does not wait for result if quotes', async () => {
    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: false,
      }),
      expect.anything(),
    );
  });

  it('resets transaction state', async () => {
    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(resetTransactionMock).toHaveBeenCalled();
  });

  it('does not enable network when feature flag is disabled', async () => {
    isRemoveGlobalNetworkSelectorEnabledMock.mockReturnValue(false);

    const tryEnableEvmNetworkMock = jest.fn();

    useNetworkEnablementMock.mockReturnValue({
      tryEnableEvmNetwork: tryEnableEvmNetworkMock,
    } as unknown as ReturnType<typeof useNetworkEnablement>);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });
    await flushPromises();

    expect(tryEnableEvmNetworkMock).not.toHaveBeenCalled();
  });

  it('calls tryEnableEvmNetwork when feature flag is enabled', async () => {
    isRemoveGlobalNetworkSelectorEnabledMock.mockReturnValue(true);

    const tryEnableEvmNetworkMock = jest.fn();

    useNetworkEnablementMock.mockReturnValue({
      tryEnableEvmNetwork: tryEnableEvmNetworkMock,
    } as unknown as ReturnType<typeof useNetworkEnablement>);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });
    await flushPromises();

    expect(tryEnableEvmNetworkMock).toHaveBeenCalledWith(CHAIN_ID_MOCK);
  });

  it('navigates to Transactions view after approval error', async () => {
    onApprovalConfirm.mockRejectedValueOnce(new Error('Test error'));

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('does nothing when transactionMetadata is missing', async () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).not.toHaveBeenCalled();
  });

  it('returns false for chainSupportsSendBundle when chainId is undefined', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      chainId: undefined,
    } as unknown as TransactionMeta);

    isSendBundleSupportedMock.mockResolvedValue(true);

    useAsyncResultMock.mockImplementation((fn) => {
      fn();
      return { pending: false, value: false };
    });

    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(isSendBundleSupportedMock).not.toHaveBeenCalled();
    expect(onApprovalConfirm).toHaveBeenCalled();
  });

  describe('navigates to', () => {
    it('perps market if perps deposit', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.perpsDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    });

    it('transactions if full screen', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('previous page if not full screen', async () => {
      useFullScreenConfirmationMock.mockReturnValue({
        isFullScreenConfirmation: false,
      });

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });

    it.each(GO_BACK_TYPES)(
      'navigates to previous page if $type',
      async (type) => {
        useFullScreenConfirmationMock.mockReturnValue({
          isFullScreenConfirmation: true,
        });

        useTransactionMetadataRequestMock.mockReturnValue({
          id: transactionIdMock,
          type,
        } as TransactionMeta);

        const { result } = renderHook();
        await result.current.onConfirm();

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      },
    );
  });

  describe('handleSmartTransaction', () => {
    beforeEach(() => {
      selectShouldUseSmartTransactionMock.mockReturnValue(true);
      useAsyncResultMock.mockReturnValue({ pending: false, value: true });
      isSendBundleSupportedMock.mockReturnValue(Promise.resolve(true));
      useSelectedGasFeeTokenMock.mockReturnValue({
        transferTransaction: { data: '0xabc', to: '0xdef', value: '0x0' },
        gas: '0x5208',
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x2',
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>);
    });
    it('adds batchTransactions and gas properties when smart transaction is enabled', async () => {
      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          batchTransactions: [
            expect.objectContaining({ data: '0xabc', to: '0xdef' }),
          ],
          txParams: expect.objectContaining({
            gas: '0x5208',
            maxFeePerGas: '0x1',
            maxPriorityFeePerGas: '0x2',
          }),
        }),
      });
    });

    it('does nothing if selectedGasFeeToken missing', async () => {
      useSelectedGasFeeTokenMock.mockReturnValue(
        undefined as unknown as ReturnType<typeof useSelectedGasFeeToken>,
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.not.objectContaining({
          batchTransactions: expect.any(Array),
        }),
      });
    });
  });

  describe('handleGasless7702', () => {
    it('sets isExternalSign when selectedGasFeeToken is present and not smart transaction', async () => {
      selectShouldUseSmartTransactionMock.mockReturnValue(false);
      isSendBundleSupportedMock.mockReturnValue(Promise.resolve(false));

      useSelectedGasFeeTokenMock.mockReturnValue({
        transferTransaction: { data: '0xabc' },
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isExternalSign: true,
        }),
      });
    });

    it('sets isExternalSign when selectedGasFeeToken is present and smart transaction but the chain does not support send bundle', async () => {
      selectShouldUseSmartTransactionMock.mockReturnValue(true);
      isSendBundleSupportedMock.mockReturnValue(Promise.resolve(false));

      useSelectedGasFeeTokenMock.mockReturnValue({
        transferTransaction: { data: '0xabc' },
      } as unknown as ReturnType<typeof useSelectedGasFeeToken>);

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.objectContaining({
          isExternalSign: true,
        }),
      });
    });

    it('does nothing if selectedGasFeeToken is missing', async () => {
      selectShouldUseSmartTransactionMock.mockReturnValue(false);
      useSelectedGasFeeTokenMock.mockReturnValue(
        undefined as unknown as ReturnType<typeof useSelectedGasFeeToken>,
      );

      const { result } = renderHook();

      await act(async () => {
        await result.current.onConfirm();
      });

      expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
        txMeta: expect.not.objectContaining({ isExternalSign: true }),
      });
    });
  });
});
