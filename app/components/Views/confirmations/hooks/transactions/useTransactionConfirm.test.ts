import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionConfirm } from './useTransactionConfirm';
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

    useApprovalRequestMock.mockReturnValue({
      onConfirm: onApprovalConfirm,
    } as unknown as ReturnType<typeof useApprovalRequest>);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: transactionIdMock,
      chainId: CHAIN_ID_MOCK,
      origin: ORIGIN_METAMASK,
    } as unknown as TransactionMeta);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
      setPayToken: noop,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTransactionTotalFiatMock.mockReturnValue({
      bridgeFeeFormatted: BRIDGE_FEE_MOCK,
      formatted: TOTAL_FIAT_MOCK,
      quoteNetworkFee: '0.0',
      totalGasFormatted: NETWORK_FEE_MOCK,
      value: '',
    });

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

  it('waits for result by default', async () => {
    const { result } = renderHook();

    await result.current.onConfirm();

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

    await result.current.onConfirm();

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: false,
      }),
      expect.anything(),
    );
  });

  it('does not wait for result if quotes', async () => {
    const { result } = renderHook({ hasQuotes: true });

    await result.current.onConfirm();

    expect(onApprovalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        waitForResult: false,
      }),
      expect.anything(),
    );
  });

  it('adds metamask pay properties to transaction metadata', async () => {
    const { result } = renderHook();

    await result.current.onConfirm();

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

    await result.current.onConfirm();

    expect(resetTransactionMock).toHaveBeenCalled();
  });

  it('does not enable network when feature flag is disabled', async () => {
    isRemoveGlobalNetworkSelectorEnabledMock.mockReturnValue(false);

    const tryEnableEvmNetworkMock = jest.fn();

    useNetworkEnablementMock.mockReturnValue({
      tryEnableEvmNetwork: tryEnableEvmNetworkMock,
    } as unknown as ReturnType<typeof useNetworkEnablement>);

    const { result } = renderHook();

    await result.current.onConfirm();
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

    await result.current.onConfirm();
    await flushPromises();

    expect(tryEnableEvmNetworkMock).toHaveBeenCalledWith(CHAIN_ID_MOCK);
  });

  it('adds batch transactions if quotes on same chain', async () => {
    const { result } = renderHook({ hasQuotes: true });

    await result.current.onConfirm();

    expect(onApprovalConfirm).toHaveBeenCalledWith(expect.anything(), {
      txMeta: expect.objectContaining({
        batchTransactions: [
          {
            data: QUOTE_MOCK.approval.data,
            gas: '0x1',
            isAfter: false,
            to: QUOTE_MOCK.approval.to,
            value: QUOTE_MOCK.approval.value,
          },
          {
            data: QUOTE_MOCK.trade.data,
            gas: '0x2',
            isAfter: false,
            to: QUOTE_MOCK.trade.to,
            value: QUOTE_MOCK.trade.value,
          },
        ],
        batchTransactionsOptions: {},
      }),
    });
  });

  describe('navigates to', () => {
    it('transaction details if transaction is perps deposit', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.perpsDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await result.current.onConfirm();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
        screen: Routes.TRANSACTION_DETAILS,
        params: { transactionId: transactionIdMock },
      });
    });

    it('transactions if full screen', async () => {
      const { result } = renderHook();

      await result.current.onConfirm();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('previous page if not full screen', async () => {
      useFullScreenConfirmationMock.mockReturnValue({
        isFullScreenConfirmation: false,
      });

      const { result } = renderHook();

      await result.current.onConfirm();

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
