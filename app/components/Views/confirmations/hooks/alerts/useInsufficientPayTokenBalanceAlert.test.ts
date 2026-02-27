import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
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
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';
import { TransactionMeta } from '@metamask/transaction-controller';

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
  stateOverrides?: Record<string, unknown>,
) {
  return renderHookWithProvider(
    () => useInsufficientPayTokenBalanceAlert(props),
    {
      state: merge({}, otherControllersMock, stateOverrides),
    },
  );
}

describe('useInsufficientPayTokenBalanceAlert', () => {
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);
  const useTransactionPayIsMaxAmountMock = jest.mocked(
    useTransactionPayIsMaxAmount,
  );
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );
  const useTransactionPayIsPostQuoteMock = jest.mocked(
    useTransactionPayIsPostQuote,
  );
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayRequiredTokensMock.mockReturnValue([REQUIRED_TOKEN_MOCK]);
    useTransactionPayTotalsMock.mockReturnValue(TOTALS_MOCK);
    useTokenWithBalanceMock.mockReturnValue(NATIVE_TOKEN_MOCK);
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
    useTransactionPayIsPostQuoteMock.mockReturnValue(false);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionMetadataRequestMock.mockReturnValue(
      undefined as unknown as TransactionMeta,
    );

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

    it('returns no alert when isMax is true regardless of required token amount', () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      useTransactionPayRequiredTokensMock.mockReturnValue([
        {
          ...REQUIRED_TOKEN_MOCK,
          amountUsd: '100.00',
        },
      ]);

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

  describe('for post-quote (withdrawal) flows', () => {
    const SOURCE_CHAIN_ID = '0x89' as Hex; // Polygon (source chain)

    // State override to include the source chain's network config so ticker resolves
    const polygonNetworkState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              [SOURCE_CHAIN_ID]: {
                nativeCurrency: 'POL',
                rpcEndpoints: [
                  {
                    networkClientId: 'polygon',
                    url: 'https://polygon-rpc.com',
                  },
                ],
                defaultRpcEndpointIndex: 0,
              },
            },
          },
        },
      },
    };

    beforeEach(() => {
      useTransactionPayIsPostQuoteMock.mockReturnValue(true);

      // payToken is the *destination* token (e.g. ETH on mainnet 0x1)
      // transactionMeta.chainId is the *source* chain (e.g. Polygon 0x89)
      useTransactionMetadataRequestMock.mockReturnValue({
        chainId: SOURCE_CHAIN_ID,
      } as TransactionMeta);
    });

    it('skips input insufficient balance check for post-quote flows', () => {
      // Balance is less than required amount - would normally trigger alert
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceUsd: '0.50', // Less than required $1.23
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook({}, polygonNetworkState);

      // No alert because post-quote funds come from withdrawal, not user balance
      expect(result.current).toStrictEqual([]);
    });

    it('skips fees insufficient balance check for post-quote flows', () => {
      // Balance is less than source amount - would normally trigger fee alert
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceRaw: '500', // Less than source amount (1000)
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook({}, polygonNetworkState);

      // No alert because post-quote funds come from withdrawal, not user balance
      expect(result.current).toStrictEqual([]);
    });

    it('uses transactionMeta.chainId (source chain) not payToken.chainId for native balance check', () => {
      // Native balance too low for gas fees on the *source* chain
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '50', // Less than max gas fee (100)
      } as ReturnType<typeof useTokenWithBalance>);

      runHook({}, polygonNetworkState);

      // Verify useTokenWithBalance was called with the SOURCE chain ID (0x89),
      // not the payToken's destination chain ID (0x1)
      expect(useTokenWithBalanceMock).toHaveBeenCalledWith(
        expect.any(String),
        SOURCE_CHAIN_ID,
      );
    });

    it('still checks native token for source network fees in post-quote flows', () => {
      // Native balance too low for gas fees
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '50', // Less than max gas fee (100)
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook({}, polygonNetworkState);

      // Alert still shows because user needs source chain native token to pay gas
      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenNative,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_native.message',
            { ticker: 'POL' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('fires source gas alert when payToken is unset (default withdraw token)', () => {
      // In withdrawal flows auto-selection is skipped, so payToken can remain undefined.
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: jest.fn(),
      });

      // Source-chain native balance too low to cover gas
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '50', // Less than max gas fee (100)
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook({}, polygonNetworkState);

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenNative,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_native.message',
            { ticker: 'POL' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('does not suppress source gas check when destination native token matches source native address', () => {
      // payToken is native on the *destination* chain (0x1) — same canonical
      // address as the source chain's native token, but different chainId.
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          address: NATIVE_TOKEN_MOCK.address as Hex, // same native address
          chainId: '0x1' as Hex, // destination chain, NOT source chain 0x89
          balanceRaw: '999999',
        },
        setPayToken: jest.fn(),
      });

      // Source-chain native balance is too low to cover gas
      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '50', // Less than max gas fee (100)
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook({}, polygonNetworkState);

      // Even though addresses match, the chainIds differ, so the gas check fires
      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenNative,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_native.message',
            { ticker: 'POL' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });
  });
});
