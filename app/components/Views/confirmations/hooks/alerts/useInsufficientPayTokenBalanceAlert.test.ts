import { type PaymentMethod } from '@metamask/ramps-controller';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  TransactionPayRequiredToken,
  TransactionPayTotals,
  TransactionPaymentToken,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { useTransactionPaySelectedFiatPaymentMethod } from '../pay/useTransactionPaySelectedFiatPaymentMethod';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { BigNumber } from 'bignumber.js';

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayBalance');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayData');
jest.mock('../tokens/useTokenWithBalance');
jest.mock('../transactions/useTransactionPayingAccount');
jest.mock('../pay/useTransactionPaySelectedFiatPaymentMethod');

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
  // Fee-inclusive total (input + all fees). Kept below the default pay balance
  // (1.23... wait, see below) so the generic balance check passes by default.
  total: { usd: '1.20' },
} as TransactionPayTotals;

const NATIVE_TOKEN_MOCK = {
  address: '0x456' as Hex,
  balanceRaw: '100',
} as NonNullable<ReturnType<typeof useTokenWithBalance>>;
const PAYER_ADDRESS = '0x2222222222222222222222222222222222222222' as Hex;
const SIGNER_ADDRESS = '0x1111111111111111111111111111111111111111' as Hex;

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
  let moneyAccountBalanceRawMock: string | undefined;

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
  const useTransactionPayingAccountMock = jest.mocked(
    useTransactionPayingAccount,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayRequiredTokensMock.mockReturnValue([REQUIRED_TOKEN_MOCK]);
    useTransactionPayTotalsMock.mockReturnValue(TOTALS_MOCK);
    useTokenWithBalanceMock.mockReturnValue(NATIVE_TOKEN_MOCK);
    useTransactionPayIsMaxAmountMock.mockReturnValue(false);
    useTransactionPayIsPostQuoteMock.mockReturnValue(false);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayingAccountMock.mockReturnValue(PAYER_ADDRESS);
    useTransactionMetadataRequestMock.mockReturnValue(
      undefined as unknown as TransactionMeta,
    );
    jest
      .mocked(useTransactionPaySelectedFiatPaymentMethod)
      .mockReturnValue(undefined);
    moneyAccountBalanceRawMock = undefined;

    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: jest.fn(),
    });

    // useTransactionPayBalance is the single source of truth for balanceUsd and
    // balanceRaw. Mirror its per-flow resolution from the same mocks the test
    // controls: money-account (override/withdraw) uses exact withdrawable raw,
    // every other flow uses the pay token's balance.
    jest.mocked(useTransactionPayBalance).mockImplementation(() => {
      const { payToken } = useTransactionPayTokenMock();

      if (moneyAccountBalanceRawMock !== undefined) {
        const usd = new BigNumber(moneyAccountBalanceRawMock).shiftedBy(-6);
        return {
          balanceRaw: moneyAccountBalanceRawMock,
          balanceUsd: usd.toNumber(),
        };
      }

      const balanceUsd = new BigNumber(payToken?.balanceUsd ?? '0').toNumber();
      return {
        balanceRaw: payToken?.balanceRaw ?? '0',
        balanceUsd,
      };
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

    describe('max money account deposit', () => {
      beforeEach(() => {
        useTransactionMetadataRequestMock.mockReturnValue({
          type: TransactionType.moneyAccountDeposit,
        } as unknown as TransactionMeta);

        // Live balance is marginally below the entered amount due to fiat
        // rounding of the balance snapshot the Max amount was derived from.
        useTransactionPayTokenMock.mockReturnValue({
          payToken: {
            ...PAY_TOKEN_MOCK,
            balanceUsd: '14.535',
          },
          setPayToken: jest.fn(),
        });
        useTransactionPayRequiredTokensMock.mockReturnValue([
          {
            ...REQUIRED_TOKEN_MOCK,
            amountUsd: '14.54',
          },
        ]);
      });

      it('returns no alert when isMax is true for a money account deposit', () => {
        useTransactionPayIsMaxAmountMock.mockReturnValue(true);

        const { result } = runHook();

        expect(result.current).toStrictEqual([]);
      });

      it('returns an alert when the deposit is not a Max deposit', () => {
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
            'alert_system.insufficient_pay_method_balance.message',
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
            'alert_system.insufficient_pay_method_balance.message',
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
            'alert_system.insufficient_pay_method_balance.message',
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

    it('returns no alert when isMax is true even if source amount exceeds balance', () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceRaw: '999',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alert when isMax is true even if source amount plus gas-fee-token exceeds balance', () => {
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);
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

      expect(result.current).toStrictEqual([]);
    });
  });

  describe('for source network fee', () => {
    it('uses paying account for native balance lookup', () => {
      runHook();

      expect(useTokenWithBalanceMock).toHaveBeenCalledWith(
        expect.any(String),
        PAY_TOKEN_MOCK.chainId,
        PAYER_ADDRESS,
      );
    });

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

    it('returns no alert when source chain is Monad even if native balance is insufficient', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          chainId: CHAIN_IDS.MONAD as Hex,
        },
        setPayToken: jest.fn(),
      });

      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '1',
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });

    it('uses the standard message (with network switch hint) for non-post-quote flows', () => {
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
      useTransactionPayingAccountMock.mockReturnValue(SIGNER_ADDRESS);

      // payToken is the *destination* token (e.g. ETH on mainnet 0x1)
      // transactionMeta.chainId is the *source* chain (e.g. Polygon 0x89)
      useTransactionMetadataRequestMock.mockReturnValue({
        chainId: SOURCE_CHAIN_ID,
      } as TransactionMeta);

      // In withdrawal flows the spendable balance is the withdrawable balance,
      // resolved independently of payToken. Default it high enough that both the
      // input and fees checks pass, so source-gas cases exercise the native
      // check in isolation.
      jest.mocked(useTransactionPayBalance).mockReturnValue({
        balanceRaw: '1000000',
        balanceUsd: 1000,
      });
    });

    it('fires input insufficient balance check for post-quote (withdrawal) flows', () => {
      // In withdrawal flows the resolved balance is the withdrawable balance
      // (perps/predict/money). When it is below the entered amount the input
      // check now fires generically — this replaces the former per-flow alerts.
      jest.mocked(useTransactionPayBalance).mockReturnValue({
        balanceRaw: '500000',
        balanceUsd: 0.5, // < required $1.23
      });

      const { result } = runHook({}, polygonNetworkState);

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

    it('fires the fees check generically in post-quote flows', () => {
      // The fees check is no longer special-cased for post-quote flows: it runs
      // against the resolved spendable balance (balanceRaw) like every other
      // flow. Resolve a balance below the source amount so the fees alert fires.
      jest.mocked(useTransactionPayBalance).mockReturnValue({
        balanceRaw: '500', // < source amount (1000) -> fees alert
        balanceUsd: 1000, // input check passes
      });

      const { result } = runHook({}, polygonNetworkState);

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenFees,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_method_balance.message',
          ),
          severity: Severity.Danger,
        },
      ]);
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
        SIGNER_ADDRESS,
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
            'alert_system.insufficient_pay_token_native_post_quote.message',
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
            'alert_system.insufficient_pay_token_native_post_quote.message',
            { ticker: 'POL' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('skips source network fee check when source chain is Monad', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        chainId: CHAIN_IDS.MONAD as Hex,
      } as TransactionMeta);

      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '1',
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
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
            'alert_system.insufficient_pay_token_native_post_quote.message',
            { ticker: 'POL' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });

    it('still checks source network fee when a payment override is set in a post-quote flow', () => {
      // Perps/Predict -> Money Account is post-quote *and* has the override set.
      // Gas is still paid on the source chain here, so the override alone must
      // not mark the source chain gasless — the native-gas check still fires.
      const overrideState = merge({}, polygonNetworkState, {
        engine: {
          backgroundState: {
            TransactionPayController: {
              transactionData: {
                'tx-post-quote-override': {
                  paymentOverride: PaymentOverride.MoneyAccount,
                },
              },
            },
          },
        },
      });

      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-post-quote-override',
        chainId: SOURCE_CHAIN_ID,
      } as TransactionMeta);

      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '50', // < max gas fee (100)
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook({}, overrideState);

      expect(result.current).toStrictEqual([
        {
          key: AlertKeys.InsufficientPayTokenNative,
          field: RowAlertKey.Amount,
          isBlocking: true,
          title: strings('alert_system.insufficient_pay_token_balance.message'),
          message: strings(
            'alert_system.insufficient_pay_token_native_post_quote.message',
            { ticker: 'POL' },
          ),
          severity: Severity.Danger,
        },
      ]);
    });
  });

  describe('money account source', () => {
    const TRANSACTION_ID_MOCK = 'tx-money-1';

    const moneyAccountState = {
      engine: {
        backgroundState: {
          TransactionPayController: {
            transactionData: {
              [TRANSACTION_ID_MOCK]: {
                paymentOverride: PaymentOverride.MoneyAccount,
              },
            },
          },
        },
      },
    };

    beforeEach(() => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: TRANSACTION_ID_MOCK,
      } as TransactionMeta);
    });

    it('uses money account balance instead of on-chain balance for input check', () => {
      moneyAccountBalanceRawMock = '500000';

      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceUsd: '100',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook({}, moneyAccountState);

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

    it('returns no input alert when money account balance covers the amount', () => {
      moneyAccountBalanceRawMock = '10000000';

      const { result } = runHook({}, moneyAccountState);

      expect(result.current).toStrictEqual([]);
    });

    it('skips fee insufficient balance check for money account source', () => {
      moneyAccountBalanceRawMock = '10000000';

      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceRaw: '999',
        },
        setPayToken: jest.fn(),
      });

      const { result } = runHook({}, moneyAccountState);

      expect(result.current).toStrictEqual([]);
    });

    it('skips source network fee check for money account source (gasless)', () => {
      // A deposit-direction money-account source (override set, not post-quote)
      // is a gasless source chain: gas is sponsored by the override path, not
      // paid from the user's native balance, so the native-gas check is skipped.
      moneyAccountBalanceRawMock = '10000000';

      useTokenWithBalanceMock.mockReturnValue({
        ...NATIVE_TOKEN_MOCK,
        balanceRaw: '99', // < source network fee (100), but source is gasless
      } as ReturnType<typeof useTokenWithBalance>);

      const { result } = runHook({}, moneyAccountState);

      expect(result.current).toStrictEqual([]);
    });

    it('returns the input alert when the money account balance is below the amount', () => {
      // The former money-account `total.usd` check has been removed in favour of
      // the generic input check against the resolved money-account balance.
      moneyAccountBalanceRawMock = '2980000'; // < required $2.99

      useTransactionPayRequiredTokensMock.mockReturnValue([
        { ...REQUIRED_TOKEN_MOCK, amountUsd: '2.99' },
      ]);

      const { result } = runHook({}, moneyAccountState);

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

    it('returns no alert when Max deposit total exceeds money account balance', () => {
      // Max + fees > balance is expected: atomic is cleared so the deposit
      // amount is reduced to leave room for fees.
      useTransactionPayIsMaxAmountMock.mockReturnValue(true);

      moneyAccountBalanceRawMock = '3000000';

      useTransactionPayRequiredTokensMock.mockReturnValue([
        { ...REQUIRED_TOKEN_MOCK, amountUsd: '3.00' },
      ]);

      useTransactionPayTotalsMock.mockReturnValue({
        ...TOTALS_MOCK,
        total: { usd: '3.15' },
      } as TransactionPayTotals);

      const { result } = runHook({}, moneyAccountState);

      expect(result.current).toStrictEqual([]);
    });

    it('returns no alert when total is within money account balance', () => {
      moneyAccountBalanceRawMock = '5000000';

      useTransactionPayRequiredTokensMock.mockReturnValue([
        { ...REQUIRED_TOKEN_MOCK, amountUsd: '2.99' },
      ]);

      useTransactionPayTotalsMock.mockReturnValue({
        ...TOTALS_MOCK,
        total: { usd: '3.06' },
      } as TransactionPayTotals);

      const { result } = runHook({}, moneyAccountState);

      expect(result.current).toStrictEqual([]);
    });

    it('skips total check during pending input (keyboard visible)', () => {
      moneyAccountBalanceRawMock = '3000000';

      useTransactionPayTotalsMock.mockReturnValue({
        ...TOTALS_MOCK,
        total: { usd: '3.06' },
      } as TransactionPayTotals);

      const { result } = runHook(
        { pendingAmountUsd: '2.99' },
        moneyAccountState,
      );

      expect(result.current).toStrictEqual([]);
    });
  });

  describe('fiat payment', () => {
    it('returns no alerts when fiat payment method is selected', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          ...PAY_TOKEN_MOCK,
          balanceUsd: '0',
        },
        setPayToken: jest.fn(),
      });

      jest
        .mocked(useTransactionPaySelectedFiatPaymentMethod)
        .mockReturnValue({ id: 'pm-card' } as PaymentMethod);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
    });
  });
});
