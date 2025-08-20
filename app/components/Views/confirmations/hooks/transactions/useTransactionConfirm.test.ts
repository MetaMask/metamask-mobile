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
import { TransactionBridgeQuote } from '../../utils/bridge';
import { ConfirmationMetricsState } from '../../../../../core/redux/slices/confirmationMetrics';
import Routes from '../../../../../constants/navigation/Routes';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { useFullScreenConfirmation } from '../ui/useFullScreenConfirmation';
import { resetTransaction } from '../../../../../actions/transaction';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../useApprovalRequest');
jest.mock('./useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionTotalFiat');
jest.mock('../../../../../selectors/smartTransactionsController');
jest.mock('../ui/useFullScreenConfirmation');
jest.mock('../../../../../actions/transaction');

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
      {
        confirmationMetrics: {
          transactionBridgeQuotesById: hasQuotes
            ? {
                [transactionIdMock]: [{} as TransactionBridgeQuote],
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
      origin: ORIGIN_METAMASK,
    } as TransactionMeta);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        decimals: 6,
        symbol: 'TST',
      },
      setPayToken: noop,
    });

    useTransactionTotalFiatMock.mockReturnValue({
      value: '',
      formatted: TOTAL_FIAT_MOCK,
    });

    selectShouldUseSmartTransactionMock.mockReturnValue(false);

    useFullScreenConfirmationMock.mockReturnValue({
      isFullScreenConfirmation: true,
    });

    resetTransactionMock.mockReturnValue({
      type: 'reset',
    });
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
          chainId: CHAIN_ID_MOCK,
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

  describe('navigates to', () => {
    it('wallet view if transaction is perps deposit', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: transactionIdMock,
        type: TransactionType.perpsDeposit,
      } as TransactionMeta);

      const { result } = renderHook();

      await result.current.onConfirm();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
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
