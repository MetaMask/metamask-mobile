import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import {
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import {
  TransactionPayRequiredToken,
  TransactionPayTotals,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { strings } from '../../../../../../locales/i18n';
import { Severity } from '../../types/alerts';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { Hex } from '@metamask/utils';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayData');
jest.mock('../tokens/useTokenWithBalance');

const PAY_TOKEN_MOCK = {
  address: '0x123' as Hex,
  chainId: '0x1' as Hex,
  balanceUsd: '1.23',
  balanceRaw: '1000',
} as TransactionPaymentToken;

const REQUIRED_TOKEN_MOCK = {
  amountUsd: '1.23',
} as TransactionPayRequiredToken;

const TOTALS_MOCK = {
  fees: {
    sourceNetwork: {
      max: {
        raw: '100',
        usd: '0.1',
      },
    },
  },
  sourceAmount: { raw: '1000', usd: '1.25' },
} as TransactionPayTotals;

const NATIVE_TOKEN_MOCK = {
  address: '0x456' as Hex,
  balanceRaw: '100',
} as NonNullable<ReturnType<typeof useTokenWithBalance>>;

function runHook(
  props: Parameters<typeof useInsufficientPayTokenBalanceAlert>[0] = {},
) {
  return renderHookWithProvider(
    () => useInsufficientPayTokenBalanceAlert(props),
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('useInsufficientPayTokenBalanceAlert', () => {
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayRequiredTokensMock.mockReturnValue([REQUIRED_TOKEN_MOCK]);
    useTransactionPayTotalsMock.mockReturnValue(TOTALS_MOCK);
    useTokenWithBalanceMock.mockReturnValue(NATIVE_TOKEN_MOCK);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: jest.fn(),
    });
  });

  describe('for input', () => {
    it('returns no alert if pay token balance is greater than required token amount', () => {
      const { result } = runHook();
      expect(result.current).toStrictEqual([]);
    });

    it('returns alert if pay token balance is less than required token amount', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceUsd: '1.22',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenBalance,
          field: RowAlertKey.Amount,
          isBlocking: true,
          message: strings(
            'alert_system.insufficient_pay_token_balance.message',
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('ignores required token amount if skipIfBalance', () => {
      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          ...REQUIRED_TOKEN_MOCK,
          skipIfBalance: true,
        },
      ]);

      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceUsd: '1.22',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });
  });

  describe('for fees', () => {
    it('returns alert if pay token balance is less than total source amount', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceRaw: '999',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenFees,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_balance_fees_no_target.message',
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('returns alert if pay token balance is less than source amount plus source network', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          address: NATIVE_TOKEN_MOCK.address as Hex,
          balanceRaw: '1000',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenFees,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_balance_fees_no_target.message',
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('returns alert if pay token balance is less than source amount plus source network if gas fee token', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceRaw: '1099',
        },
        setPayToken: jest.fn(),
      });

      useTransactionPayTotalsMock.mockReturnValue({
        ...TOTALS_MOCK,
        fees: {
          ...TOTALS_MOCK.fees,
          isSourceGasFeeToken: true,
        },
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenFees,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_balance_fees_no_target.message',
            { amount: '$1.11' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('returns no alert if pending amount provided', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceRaw: '999',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook({ pendingAmountUsd: '1.23' });

      expect(result.current).toStrictEqual([]);
    });
  });

  describe('for source network fee', () => {
    it('returns alert if native balance is less than total source network fee', () => {
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '99',
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook();

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenNative,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_native.message',
            { ticker: 'ETH' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('returns no alert if pay token is native', () => {
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '99',
      } as ReturnType<typeof useTokenWithBalance>);

      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          address: NATIVE_TOKEN_MOCK.address as Hex,
          balanceRaw: '1100',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alert if source network is using gas fee token', () => {
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '99',
      } as ReturnType<typeof useTokenWithBalance>);

      useTransactionPayTotalsMock.mockReturnValue({
        ...TOTALS_MOCK,
        fees: {
          ...TOTALS_MOCK.fees,
          isSourceGasFeeToken: true,
        },
        sourceAmount: TOTALS_MOCK.sourceAmount,
      });

      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceRaw: '1100',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alert if pending amount provided', () => {
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '99',
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook({ pendingAmountUsd: '1.23' });

      expect(result.current).toStrictEqual([]);
    });
  });
});
