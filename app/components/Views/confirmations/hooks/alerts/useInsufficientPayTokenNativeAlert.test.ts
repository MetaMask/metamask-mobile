import { renderHook } from '@testing-library/react-native';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useInsufficientPayTokenNativeAlert } from './useInsufficientPayTokenNativeAlert';
import { useTransactionTotalFiat } from '../pay/useTransactionTotalFiat';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionTotalFiat');
jest.mock('../tokens/useTokenWithBalance');

const CHAIN_ID_MOCK = '0x123';
const BALANCE_FIAT = 123.45;

function runHook() {
  return renderHook(() => useInsufficientPayTokenNativeAlert());
}

describe('useInsufficientPayTokenNativeAlert', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionTotalFiatMock = jest.mocked(useTransactionTotalFiat);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns alert if native balance less than quote network fees', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { chainId: CHAIN_ID_MOCK },
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTokenWithBalanceMock.mockReturnValue({
      address: NATIVE_TOKEN_ADDRESS,
      chainId: CHAIN_ID_MOCK,
      tokenFiatAmount: BALANCE_FIAT,
    } as unknown as ReturnType<typeof useTokenWithBalance>);

    useTransactionTotalFiatMock.mockReturnValue({
      quoteNetworkFee: `${BALANCE_FIAT + 0.01}`,
    } as unknown as ReturnType<typeof useTransactionTotalFiat>);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPayTokenNative,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.insufficient_pay_token_native.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns alert if native balance less than total and pay token is native', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { chainId: CHAIN_ID_MOCK, address: NATIVE_TOKEN_ADDRESS },
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTokenWithBalanceMock.mockReturnValue({
      address: NATIVE_TOKEN_ADDRESS,
      chainId: CHAIN_ID_MOCK,
      tokenFiatAmount: BALANCE_FIAT,
    } as unknown as ReturnType<typeof useTokenWithBalance>);

    useTransactionTotalFiatMock.mockReturnValue({
      quoteNetworkFee: `${BALANCE_FIAT}`,
      value: `${BALANCE_FIAT + 0.01}`,
    } as unknown as ReturnType<typeof useTransactionTotalFiat>);

    const { result } = runHook();

    expect(result.current).toEqual([
      {
        key: AlertKeys.InsufficientPayTokenNative,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.insufficient_pay_token_native.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alerts if native balance sufficient', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: { chainId: CHAIN_ID_MOCK },
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTokenWithBalanceMock.mockReturnValue({
      address: NATIVE_TOKEN_ADDRESS,
      chainId: CHAIN_ID_MOCK,
      tokenFiatAmount: BALANCE_FIAT,
    } as unknown as ReturnType<typeof useTokenWithBalance>);

    useTransactionTotalFiatMock.mockReturnValue({
      quoteNetworkFee: `${BALANCE_FIAT}`,
    } as unknown as ReturnType<typeof useTransactionTotalFiat>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts if no payment token selected', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as unknown as ReturnType<typeof useTransactionPayToken>);

    useTokenWithBalanceMock.mockReturnValue({
      address: NATIVE_TOKEN_ADDRESS,
      chainId: CHAIN_ID_MOCK,
      tokenFiatAmount: BALANCE_FIAT,
    } as unknown as ReturnType<typeof useTokenWithBalance>);

    useTransactionTotalFiatMock.mockReturnValue({
      quoteNetworkFee: `${BALANCE_FIAT + 0.01}`,
    } as unknown as ReturnType<typeof useTransactionTotalFiat>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
