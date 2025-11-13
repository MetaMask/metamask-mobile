import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useInsufficientPayTokenNativeAlert } from './useInsufficientPayTokenNativeAlert';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { selectTickerByChainId } from '../../../../../selectors/networkController';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { TransactionPayTotals } from '@metamask/transaction-pay-controller';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../tokens/useTokenWithBalance');
jest.mock('../../../../../selectors/networkController');
jest.mock('../pay/useTransactionPayData');

const CHAIN_ID_MOCK = '0x123';
const BALANCE_FIAT = 123.45;
const TICKER_MOCK = 'TST';

function runHook() {
  return renderHookWithProvider(() => useInsufficientPayTokenNativeAlert());
}

describe('useInsufficientPayTokenNativeAlert', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);
  const selectTickerByChainIdMock = jest.mocked(selectTickerByChainId);
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);

  beforeEach(() => {
    jest.resetAllMocks();

    selectTickerByChainIdMock.mockReturnValue(TICKER_MOCK);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: { chainId: CHAIN_ID_MOCK },
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTokenWithBalanceMock.mockReturnValue({
      address: NATIVE_TOKEN_ADDRESS,
      chainId: CHAIN_ID_MOCK,
      tokenFiatAmount: BALANCE_FIAT,
    } as unknown as ReturnType<typeof useTokenWithBalance>);

    useTransactionPayQuotesMock.mockReturnValue([{}] as unknown as ReturnType<
      typeof useTransactionPayQuotes
    >);

    useTransactionPayTotalsMock.mockReturnValue({
      fees: { sourceNetwork: { fiat: `${BALANCE_FIAT + 0.01}` } },
    } as TransactionPayTotals);
  });

  it('returns alert if native balance less than quote source network fees', () => {
    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPayTokenNative,
        field: RowAlertKey.PayWithFee,
        message: strings('alert_system.insufficient_pay_token_native.message', {
          ticker: TICKER_MOCK,
        }),
        title: strings('alert_system.insufficient_pay_token_native.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns alert if native balance less than total and pay token is native', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { chainId: CHAIN_ID_MOCK, address: NATIVE_TOKEN_ADDRESS },
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTransactionPayTotalsMock.mockReturnValue({
      total: { fiat: `${BALANCE_FIAT + 0.01}` },
    } as TransactionPayTotals);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPayTokenNative,
        field: RowAlertKey.PayWithFee,
        message: strings('alert_system.insufficient_pay_token_native.message', {
          ticker: TICKER_MOCK,
        }),
        title: strings('alert_system.insufficient_pay_token_native.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alerts if native balance sufficient', () => {
    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        sourceNetwork: {
          fiat: `${BALANCE_FIAT - 0.01}`,
        },
      },
    } as TransactionPayTotals);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts if no payment token selected', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts if no quotes', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
