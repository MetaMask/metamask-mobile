import { act } from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  DepositPrefillStatus,
  useDepositPrefillAmount,
} from './useDepositPrefillAmount';
import {
  selectMetaMaskPayFlags,
  selectDepositLimits,
} from '../../../../../selectors/featureFlagController/confirmations';
import { selectAccountOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { isRouteToken } from '../../utils/relayFixedSpread';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayAvailableTokens } from '../pay/useTransactionPayAvailableTokens';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/utils/moneyAccountDepositIntent';
import { resolveABTestAssignment } from '../../../../../util/abTest';
import { MoneyAccountDepositPrefillVariant } from './abTestConfig';
import { useParams } from '../../../../../util/navigation/navUtils';

jest.mock('../../../../UI/Money/utils/moneyAccountDepositIntent', () => ({
  getMoneyAccountDepositIntent: jest.fn(),
}));

jest.mock('../../../../../util/abTest', () => ({
  resolveABTestAssignment: jest.fn(),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ),
    selectMetaMaskPayFlags: jest.fn(),
    selectDepositLimits: jest.fn(),
  }),
);

jest.mock('../../utils/relayFixedSpread', () => ({
  ...jest.requireActual('../../utils/relayFixedSpread'),
  isRouteToken: jest.fn(),
}));

jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayAvailableTokens');
jest.mock('../pay/useTransactionPayBalance');
jest.mock('../pay/useTransactionPayData');
jest.mock('./useTransactionMetadataRequest');

jest.mock('../../../../../selectors/transactionPayController', () => ({
  ...jest.requireActual('../../../../../selectors/transactionPayController'),
  selectAccountOverrideByTransactionId: jest.fn(),
}));

const TOKEN_ADDRESS_MOCK = '0x1234567890123456789012345678901234567890' as Hex;
const TOKEN_ADDRESS_B_MOCK =
  '0x9876543210987654321098765432109876543210' as Hex;
const CHAIN_ID_MOCK = '0x1' as Hex;
const BATCH_ID_MOCK = '0xtestbatchid';
const TRANSACTION_ID_MOCK = 'test-tx-id';

const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
const useTransactionPayAvailableTokensMock = jest.mocked(
  useTransactionPayAvailableTokens,
);
const useTransactionPayBalanceMock = jest.mocked(useTransactionPayBalance);
const useTransactionPayFiatPaymentMock = jest.mocked(
  useTransactionPayFiatPayment,
);
const selectMetaMaskPayFlagsMock =
  selectMetaMaskPayFlags as unknown as jest.Mock;
const selectDepositLimitsMock = selectDepositLimits as unknown as jest.Mock;
const isRouteTokenMock = isRouteToken as unknown as jest.Mock;
const selectAccountOverrideMock =
  selectAccountOverrideByTransactionId as unknown as jest.Mock;
const getMoneyAccountDepositIntentMock = jest.mocked(
  getMoneyAccountDepositIntent,
);
const resolveABTestAssignmentMock = jest.mocked(resolveABTestAssignment);
const useParamsMock = jest.mocked(useParams);

function mockDepositPrefillAbVariant(
  variant: MoneyAccountDepositPrefillVariant = MoneyAccountDepositPrefillVariant.Treatment,
) {
  resolveABTestAssignmentMock.mockReturnValue({
    variantName: variant,
    isActive: true,
  });
}

function makeTransactionMeta(
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: TRANSACTION_ID_MOCK,
    type: TransactionType.moneyAccountDeposit,
    batchId: BATCH_ID_MOCK,
    chainId: CHAIN_ID_MOCK,
    txParams: { from: '0xabc' },
    ...overrides,
  } as unknown as TransactionMeta;
}

function makePayToken(
  overrides?: Partial<TransactionPaymentToken>,
): TransactionPaymentToken {
  return {
    address: TOKEN_ADDRESS_MOCK,
    balanceUsd: '1000',
    chainId: CHAIN_ID_MOCK,
    ...overrides,
  } as TransactionPaymentToken;
}

/**
 * Sets the pay token together with the reactive balance the hook reads, so a
 * token's `balanceUsd` keeps describing what the wallet holds.
 */
function setPayTokenWithBalance(payToken?: TransactionPaymentToken) {
  useTransactionPayTokenMock.mockReturnValue({
    payToken,
  } as ReturnType<typeof useTransactionPayToken>);
  useTransactionPayBalanceMock.mockReturnValue({
    balanceRaw: '0',
    balanceUsd: Number(payToken?.balanceUsd ?? 0),
  });
}

function setupMocks(
  overrides: {
    prefilledAmountDefault?: { enabled: boolean };
    prefilledAmountOverrides?: Record<string, { enabled: boolean }>;
    depositLimits?: Record<string, number>;
    payToken?: TransactionPaymentToken | null;
    /** Reactive balance, when it must differ from the pay token snapshot. */
    payBalanceUsd?: number;
    transactionMeta?: TransactionMeta;
    accountOverride?: string;
    availableTokenBalances?: number[];
    availableTokensDisabled?: boolean;
    fiatPaymentSelected?: boolean;
    stablecoin?: boolean;
    depositIntent?: string;
  } = {},
) {
  const {
    prefilledAmountDefault = { enabled: false },
    prefilledAmountOverrides = { moneyAccountDeposit: { enabled: true } },
    depositLimits = {},
    transactionMeta = makeTransactionMeta(),
    availableTokenBalances = [1000],
    availableTokensDisabled = false,
    stablecoin = true,
    depositIntent = 'convert',
  } = overrides;

  const resolvedPayToken =
    'payToken' in overrides
      ? (overrides.payToken ?? undefined)
      : makePayToken();

  useTransactionMetadataRequestMock.mockReturnValue(transactionMeta);
  setPayTokenWithBalance(resolvedPayToken);

  if (overrides.payBalanceUsd !== undefined) {
    useTransactionPayBalanceMock.mockReturnValue({
      balanceRaw: '0',
      balanceUsd: overrides.payBalanceUsd,
    });
  }
  useTransactionPayAvailableTokensMock.mockReturnValue({
    availableTokens: availableTokenBalances.map((balance, index) => ({
      address: `${TOKEN_ADDRESS_MOCK}-${index}`,
      chainId: CHAIN_ID_MOCK,
      disabled: availableTokensDisabled,
      fiat: { balance },
    })),
    hasTokens: availableTokenBalances.length > 0,
  } as ReturnType<typeof useTransactionPayAvailableTokens>);
  useTransactionPayFiatPaymentMock.mockReturnValue(
    overrides.fiatPaymentSelected
      ? ({ selectedPaymentMethodId: 'fiat-method' } as never)
      : undefined,
  );

  selectMetaMaskPayFlagsMock.mockReturnValue({
    prefilledAmount: {
      default: prefilledAmountDefault,
      overrides: prefilledAmountOverrides,
    },
  });
  selectDepositLimitsMock.mockReturnValue(depositLimits);
  isRouteTokenMock.mockReturnValue(stablecoin);
  selectAccountOverrideMock.mockReturnValue(overrides.accountOverride);
  getMoneyAccountDepositIntentMock.mockReturnValue(
    depositIntent as ReturnType<typeof getMoneyAccountDepositIntent>,
  );
}

function runHook(options?: { autoSelectFiatPayment?: boolean }) {
  return renderHookWithProvider(() => useDepositPrefillAmount(options), {
    state: {},
  });
}

describe('useDepositPrefillAmount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockDepositPrefillAbVariant(MoneyAccountDepositPrefillVariant.Treatment);
    useParamsMock.mockReturnValue({});
    setupMocks();
  });

  describe('enabled/disabled', () => {
    it('returns disabled result when flag is disabled', () => {
      setupMocks({
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {},
      });

      const { result } = runHook();

      expect(result.current).toEqual({
        prefillAmount: undefined,
        percentage: undefined,
        isLimitCapped: false,
        status: DepositPrefillStatus.Disabled,
      });
    });

    it('does not enable amount prefill for addMusd when kill-switch/A/B are off', () => {
      mockDepositPrefillAbVariant(MoneyAccountDepositPrefillVariant.Control);
      setupMocks({
        depositIntent: 'addMusd',
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {},
      });

      const { result } = runHook();

      // addMusd amount autofill is owned by useTransactionCustomAmount at 100%.
      expect(result.current.status).toBe(DepositPrefillStatus.Disabled);
    });

    it('returns disabled for card intent even when treatment and flag enabled', () => {
      setupMocks({ depositIntent: 'card' });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Disabled);
    });

    it('returns disabled for control A/B variant even when flag override enabled', () => {
      mockDepositPrefillAbVariant(MoneyAccountDepositPrefillVariant.Control);
      setupMocks();

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Disabled);
    });

    it('returns enabled when flag has override for moneyAccountDeposit', () => {
      setupMocks();

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
      expect(result.current.prefillAmount).toBeDefined();
    });

    it('prefills the explicit Money amount instead of a balance percentage', () => {
      useParamsMock.mockReturnValue({ amount: '5' });
      setupMocks({
        transactionMeta: makeTransactionMeta({
          type: TransactionType.moneyAccountDeposit,
        }),
      });

      const { result } = runHook();

      expect(result.current).toEqual({
        prefillAmount: '5',
        percentage: undefined,
        isLimitCapped: false,
        status: DepositPrefillStatus.Prefilled,
      });
    });

    it('prefills an explicit amount even when balance prefill flags are disabled', () => {
      useParamsMock.mockReturnValue({ amount: '5' });
      mockDepositPrefillAbVariant(MoneyAccountDepositPrefillVariant.Control);
      setupMocks({
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {},
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('5');
      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });

    it('waits for a selected payment token before preparing the explicit amount', () => {
      useParamsMock.mockReturnValue({ amount: '5' });
      setupMocks({ payToken: null });

      const { result, rerender } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Loading);
      act(() => {
        setPayTokenWithBalance(makePayToken());
        rerender({});
      });
      expect(result.current.prefillAmount).toBe('5');
      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });

    it.each(['0', '-5', 'NaN', 'Infinity'])(
      'does not automatically quote amount %s',
      (amount) => {
        useParamsMock.mockReturnValue({ amount });

        const { result } = runHook();

        expect(result.current.status).toBe(DepositPrefillStatus.Disabled);
      },
    );

    it('skips explicit amount autoquote without a funded token', () => {
      useParamsMock.mockReturnValue({ amount: '5' });
      setupMocks({ payToken: null, availableTokenBalances: [] });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
    });

    it('preserves the explicit amount instead of capping it to balance or deposit limits', () => {
      useParamsMock.mockReturnValue({ amount: '5' });
      setupMocks({
        payToken: makePayToken({ balanceUsd: '2' }),
        depositLimits: { moneyAccountDeposit: 3 },
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('5');
      expect(result.current.percentage).toBeUndefined();
      expect(result.current.isLimitCapped).toBe(false);
    });

    it('leaves explicit fiat amounts on the input flow', () => {
      useParamsMock.mockReturnValue({ amount: '5' });

      const { result } = runHook({ autoSelectFiatPayment: true });

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
    });

    it('keeps perpsDeposit prefill enabled when navigation provides an explicit amount', () => {
      useParamsMock.mockReturnValue({ amount: '5' });
      setupMocks({
        transactionMeta: makeTransactionMeta({
          type: TransactionType.perpsDeposit,
        }),
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {
          perpsDeposit: { enabled: true },
        },
      });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
      expect(result.current.prefillAmount).toBe('1000');
    });

    it('does not apply the money-account A/B gate for non-deposit transaction types', () => {
      mockDepositPrefillAbVariant(MoneyAccountDepositPrefillVariant.Control);
      setupMocks({
        transactionMeta: makeTransactionMeta({
          type: TransactionType.perpsDeposit,
        }),
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {
          perpsDeposit: { enabled: true },
        },
      });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });
  });

  describe('prefillAmount computation', () => {
    it('computes 100% for stablecoin', () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '500' }),
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('500');
      expect(result.current.percentage).toBe(100);
      expect(result.current.isLimitCapped).toBe(false);
    });

    it('computes 50% for non-stablecoin', () => {
      setupMocks({
        stablecoin: false,
        payToken: makePayToken({ balanceUsd: '1000' }),
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('500');
      expect(result.current.percentage).toBe(50);
      expect(result.current.isLimitCapped).toBe(false);
    });

    it('caps at deposit limit when balance exceeds it', () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '200000' }),
        depositLimits: { moneyAccountDeposit: 100000 },
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('100000');
      expect(result.current.percentage).toBe(100);
      expect(result.current.isLimitCapped).toBe(true);
    });

    it('returns undefined when no payToken', () => {
      setupMocks({ payToken: null });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBeUndefined();
    });

    it('returns undefined when balanceUsd is 0', () => {
      setupMocks({
        payToken: makePayToken({ balanceUsd: '0' }),
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBeUndefined();
    });

    it('formats integer amounts without decimals', () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '500' }),
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('500');
      expect(result.current.prefillAmount).not.toBe('500.00');
    });

    it('formats decimal amounts to 2 places', () => {
      setupMocks({
        stablecoin: false,
        payToken: makePayToken({ balanceUsd: '2.54' }),
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('1.27');
    });
  });

  describe('commit effect', () => {
    it('returns prefillAmount when committed', () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '500' }),
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('500');
      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });

    it('sets isLoading to false after commit', () => {
      setupMocks();

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });

    it('only commits once when balance changes on same token', async () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '500' }),
      });

      const { result, rerender } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
      expect(result.current.prefillAmount).toBe('500');

      setPayTokenWithBalance(makePayToken({ balanceUsd: '9999' }));

      await act(async () => {
        rerender({});
      });

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });
  });

  describe('zero-balance pay token', () => {
    it('settles instead of loading when the pay token has no balance', () => {
      setupMocks({ payToken: makePayToken({ balanceUsd: '0' }) });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
      expect(result.current.prefillAmount).toBeUndefined();
    });

    // Regression (device): `payToken.balanceUsd` is snapshotted when the token
    // is selected and reads 0 until AccountTracker catches up. Skipping on it
    // opened the keypad on a funded wallet for the ~2s until the real balance
    // landed, instead of holding the amount loader.
    it('prefills from the reactive balance when the pay token snapshot reads zero', () => {
      setupMocks({
        payToken: makePayToken({ balanceUsd: '0' }),
        payBalanceUsd: 59.64,
      });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
      expect(result.current.prefillAmount).toBe('59.64');
    });

    it('settles instead of loading when the balance snapshot is not numeric', () => {
      // The snapshot on the pay token can be non-numeric while the reactive
      // balance in the pay-with row is fine. `NaN` produces no prefill amount
      // and is not `<= 0`, so waiting on it loaded forever.
      setupMocks({ payToken: makePayToken({ balanceUsd: 'US$49.14' }) });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
      expect(result.current.prefillAmount).toBeUndefined();
    });

    it('settles instead of loading when every funded token is disabled', () => {
      // Disabled tokens are excluded from automatic pay-token selection, so no
      // pay token can arrive to prefill from.
      setupMocks({
        payToken: null,
        availableTokenBalances: [1000],
        availableTokensDisabled: true,
      });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
    });

    it('keeps loading while the pay token is still unresolved', () => {
      setupMocks({ payToken: null });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Loading);
    });

    it('does not skip when prefill is disabled', () => {
      setupMocks({
        payToken: makePayToken({ balanceUsd: '0' }),
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {},
      });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Disabled);
    });

    it('skips when fiat payment is selected without a pay token', () => {
      setupMocks({ fiatPaymentSelected: true, payToken: null });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
    });

    it('skips when fiat payment auto-selection is requested', () => {
      const { result } = runHook({ autoSelectFiatPayment: true });

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
    });

    it('skips when no pay token or funded available token exists', () => {
      setupMocks({ availableTokenBalances: [], payToken: null });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
    });
  });

  describe('reset effect', () => {
    it('resets when switching to a zero-balance account', async () => {
      setupMocks();

      const { result, rerender } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);

      selectAccountOverrideMock.mockReturnValue('new-account-override');
      setPayTokenWithBalance(makePayToken({ balanceUsd: '0' }));

      await act(async () => {
        rerender({});
      });

      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
      // Nothing to prefill from, so the amount settles at $0 rather than
      // waiting on an amount that can never arrive.
      expect(result.current.status).toBe(DepositPrefillStatus.Skipped);
    });

    it('recommits with new amount when payToken address changes', async () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '500' }),
      });

      const { result, rerender } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
      expect(result.current.prefillAmount).toBe('500');

      setPayTokenWithBalance(
        makePayToken({
          address: TOKEN_ADDRESS_B_MOCK,
          balanceUsd: '800',
        }),
      );

      await act(async () => {
        rerender({});
      });

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
      expect(result.current.prefillAmount).toBe('800');
      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });
  });

  describe('isLoading', () => {
    it('true when enabled but not yet committed', () => {
      setupMocks({ payToken: null });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Loading);
    });

    it('false when not enabled', () => {
      setupMocks({
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {},
      });

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Disabled);
    });

    it('false after commit', () => {
      setupMocks();

      const { result } = runHook();

      expect(result.current.status).toBe(DepositPrefillStatus.Prefilled);
    });
  });
});
