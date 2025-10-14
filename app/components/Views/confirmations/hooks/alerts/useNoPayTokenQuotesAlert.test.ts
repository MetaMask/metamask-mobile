import { cloneDeep, merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { Severity } from '../../types/alerts';
import { useNoPayTokenQuotesAlert } from './useNoPayTokenQuotesAlert';
import { RootState } from '../../../../../reducers';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { Hex } from '@metamask/utils';
import { ConfirmationMetricsState } from '../../../../../core/redux/slices/confirmationMetrics';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { TransactionBridgeQuote } from '../../utils/bridge';
import { strings } from '../../../../../../locales/i18n';
import { useIsTransactionPayLoading } from '../pay/useIsTransactionPayLoading';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useIsTransactionPayLoading');

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
) as unknown as RootState;

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
const CHAIN_ID_MOCK = '0x123' as Hex;

function runHook({
  quotes,
}: {
  quotes?: Partial<TransactionBridgeQuote>[];
} = {}) {
  const state = cloneDeep(STATE_MOCK);

  state.confirmationMetrics = {
    metricsById: {},
    transactionBridgeQuotesById: {
      [transactionIdMock]: quotes ?? undefined,
    },
  } as unknown as ConfirmationMetricsState;

  return renderHookWithProvider(useNoPayTokenQuotesAlert, {
    state,
  });
}

describe('useNoPayTokenQuotesAlert', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
    } as ReturnType<typeof useTransactionPayToken>);

    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: false });
  });

  it('returns alert if pay token selected and no quotes available', () => {
    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.NoPayTokenQuotes,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.no_pay_token_quotes.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alerts if quotes available', () => {
    const { result } = runHook({ quotes: [{}] });
    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts if quotes loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue({ isLoading: true });

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts if quotes is empty array', () => {
    const { result } = runHook({ quotes: [] });
    expect(result.current).toStrictEqual([]);
  });
});
