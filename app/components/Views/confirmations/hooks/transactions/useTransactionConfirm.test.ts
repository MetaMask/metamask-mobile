import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useApprovalRequest from '../useApprovalRequest';
import { GO_BACK_TYPES, useTransactionConfirm } from './useTransactionConfirm';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { merge, noop } from 'lodash';
import { useTransactionTotalFiat } from '../pay/useTransactionTotalFiat';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { ConfirmationMetricsState } from '../../../../../core/redux/slices/confirmationMetrics';
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

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../useApprovalRequest');
jest.mock('./useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionTotalFiat');
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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const CHAIN_ID_MOCK = '0x123';
const TOKEN_ADDRESS_MOCK = '0x123456789abcdef1234567890abcdef12345678';
const TOTAL_FIAT_MOCK = '$123.45';
const NETWORK_FEE_MOCK = '$234.56';
const BRIDGE_FEE_MOCK = '$345.67';

const QUOTE_MOCK = {
  quote: {
    srcChainId: 1,
    destChainId: 1,
  },
  approval: {
    data: '0x1',
    gasLimit: 1,
    to: '0x2',
    value: '0x3',
  },
  trade: {
    data: '0x4',
    gasLimit: 2,
    to: '0x5',
    value: '0x6',
  },
};

function renderHook(
  { hasQuotes }: { hasQuotes: boolean } = {
    hasQuotes: false,
  },
) {
  return renderHookWithProvider(useTransactionConfirm, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        confirmationMetrics: {
          transactionBridgeQuotesById: hasQuotes
            ? {
                [transactionIdMock]: [QUOTE_MOCK],
              }
            : {},
        } as unknown as ConfirmationMetricsState,
      },
    ),
  });
}

describe('useTransactionConfirm', () => {
  const useApprovalRequestMock = jest.mocked(useApprovalRequest);
  const onApprovalConfirm = jest.fn();
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);
  const useFullScreenConfirmationMock = jest.mocked(useFullScreenConfirmation);
  const resetTransactionMock = jest.mocked(resetTransaction);
  const useNetworkEnablementMock = jest.mocked(useNetworkEnablement);
  const useSelectedGasFeeTokenMock = jest.mocked(useSelectedGasFeeToken);
  const isSendBundleSupportedMock = jest.mocked(isSendBundleSupported);
  const useAsyncResultMock = jest.mocked(useAsyncResultHook);

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

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
      setPayToken: noop,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTransactionTotalFiatMock.mockReturnValue({
      totalBridgeFeeFormatted: BRIDGE_FEE_MOCK,
      totalFormatted: TOTAL_FIAT_MOCK,
      totalNativeEstimatedFormatted: NETWORK_FEE_MOCK,
    } as ReturnType<typeof useTransactionTotalFiat>);

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
    const { result } = renderHook({ hasQuotes: true });

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

  it('adds metamask pay properties to transaction metadata', async () => {
    const { result } = renderHook();

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
      txMeta: expect.objectContaining({
        metamaskPay: {
          bridgeFeeFiat: BRIDGE_FEE_MOCK,
          chainId: CHAIN_ID_MOCK,
          networkFeeFiat: NETWORK_FEE_MOCK,
          tokenAddress: TOKEN_ADDRESS_MOCK,
          totalFiat: TOTAL_FIAT_MOCK,
        },
      }),
    });
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

  it('adds batch transactions if quotes on same chain', async () => {
    const { result } = renderHook({ hasQuotes: true });

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
      txMeta: expect.objectContaining({
        batchTransactions: [
          {
            data: QUOTE_MOCK.approval.data,
            gas: '0x1',
            isAfter: false,
            to: QUOTE_MOCK.approval.to,
            type: TransactionType.swapApproval,
            value: QUOTE_MOCK.approval.value,
          },
          {
            data: QUOTE_MOCK.trade.data,
            gas: '0x2',
            isAfter: false,
            to: QUOTE_MOCK.trade.to,
            type: TransactionType.swap,
            value: QUOTE_MOCK.trade.value,
          },
        ],
        batchTransactionsOptions: {},
      }),
    });
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
