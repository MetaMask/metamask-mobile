import { act } from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useDepositPrefillAmount } from './useDepositPrefillAmount';
import {
  selectMetaMaskPayFlags,
  selectDepositLimits,
} from '../../../../../selectors/featureFlagController/confirmations';
import { selectAccountOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { isStablecoin } from '../../utils/token';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { getMoneyAccountDepositIntent } from '../../../../UI/Money/hooks/useMoneyAccount';

jest.mock('../../../../UI/Money/hooks/useMoneyAccount', () => ({
  ...jest.requireActual('../../../../UI/Money/hooks/useMoneyAccount'),
  getMoneyAccountDepositIntent: jest.fn(),
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

jest.mock('../../utils/token', () => ({
  ...jest.requireActual('../../utils/token'),
  isStablecoin: jest.fn(),
}));

jest.mock('../pay/useTransactionPayToken');
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
const selectMetaMaskPayFlagsMock =
  selectMetaMaskPayFlags as unknown as jest.Mock;
const selectDepositLimitsMock = selectDepositLimits as unknown as jest.Mock;
const isStablecoinMock = isStablecoin as unknown as jest.Mock;
const selectAccountOverrideMock =
  selectAccountOverrideByTransactionId as unknown as jest.Mock;
const getMoneyAccountDepositIntentMock = jest.mocked(
  getMoneyAccountDepositIntent,
);

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

function setupMocks(
  overrides: {
    prefilledAmountDefault?: { enabled: boolean };
    prefilledAmountOverrides?: Record<string, { enabled: boolean }>;
    depositLimits?: Record<string, number>;
    payToken?: TransactionPaymentToken | null;
    transactionMeta?: TransactionMeta;
    accountOverride?: string;
    stablecoin?: boolean;
    depositIntent?: string;
  } = {},
) {
  const {
    prefilledAmountDefault = { enabled: false },
    prefilledAmountOverrides = { moneyAccountDeposit: { enabled: true } },
    depositLimits = {},
    transactionMeta = makeTransactionMeta(),
    stablecoin = true,
    depositIntent = 'convert',
  } = overrides;

  const resolvedPayToken =
    'payToken' in overrides
      ? (overrides.payToken ?? undefined)
      : makePayToken();

  useTransactionMetadataRequestMock.mockReturnValue(transactionMeta);
  useTransactionPayTokenMock.mockReturnValue({
    payToken: resolvedPayToken,
  } as ReturnType<typeof useTransactionPayToken>);

  selectMetaMaskPayFlagsMock.mockReturnValue({
    prefilledAmount: {
      default: prefilledAmountDefault,
      overrides: prefilledAmountOverrides,
    },
  });
  selectDepositLimitsMock.mockReturnValue(depositLimits);
  isStablecoinMock.mockReturnValue(stablecoin);
  selectAccountOverrideMock.mockReturnValue(overrides.accountOverride);
  getMoneyAccountDepositIntentMock.mockReturnValue(
    depositIntent as ReturnType<typeof getMoneyAccountDepositIntent>,
  );
}

function runHook() {
  return renderHookWithProvider(() => useDepositPrefillAmount(), { state: {} });
}

describe('useDepositPrefillAmount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
        enabled: false,
        isLoading: false,
        hasPrefilled: false,
      });
    });

    it('returns enabled when intent is addMusd', () => {
      setupMocks({ depositIntent: 'addMusd' });

      const { result } = runHook();

      expect(result.current.enabled).toBe(true);
      expect(result.current.hasPrefilled).toBe(true);
    });

    it('returns enabled when flag has override for moneyAccountDeposit', () => {
      setupMocks();

      const { result } = runHook();

      expect(result.current.hasPrefilled).toBe(true);
      expect(result.current.prefillAmount).toBeDefined();
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
    });

    it('computes 50% for non-stablecoin', () => {
      setupMocks({
        stablecoin: false,
        payToken: makePayToken({ balanceUsd: '1000' }),
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('500');
    });

    it('caps at deposit limit when balance exceeds it', () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '200000' }),
        depositLimits: { moneyAccountDeposit: 100000 },
      });

      const { result } = runHook();

      expect(result.current.prefillAmount).toBe('100000');
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
      expect(result.current.hasPrefilled).toBe(true);
    });

    it('sets isLoading to false after commit', () => {
      setupMocks();

      const { result } = runHook();

      expect(result.current.isLoading).toBe(false);
    });

    it('only commits once when balance changes on same token', async () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '500' }),
      });

      const { result, rerender } = runHook();

      expect(result.current.hasPrefilled).toBe(true);
      expect(result.current.prefillAmount).toBe('500');

      useTransactionPayTokenMock.mockReturnValue({
        payToken: makePayToken({ balanceUsd: '9999' }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
      });

      expect(result.current.hasPrefilled).toBe(true);
    });
  });

  describe('reset effect', () => {
    it('resets when switching to a zero-balance account', async () => {
      setupMocks();

      const { result, rerender } = runHook();

      expect(result.current.hasPrefilled).toBe(true);

      selectAccountOverrideMock.mockReturnValue('new-account-override');
      useTransactionPayTokenMock.mockReturnValue({
        payToken: makePayToken({ balanceUsd: '0' }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
      });

      expect(result.current.hasPrefilled).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('recommits with new amount when payToken address changes', async () => {
      setupMocks({
        stablecoin: true,
        payToken: makePayToken({ balanceUsd: '500' }),
      });

      const { result, rerender } = runHook();

      expect(result.current.hasPrefilled).toBe(true);
      expect(result.current.prefillAmount).toBe('500');

      useTransactionPayTokenMock.mockReturnValue({
        payToken: makePayToken({
          address: TOKEN_ADDRESS_B_MOCK,
          balanceUsd: '800',
        }),
      } as ReturnType<typeof useTransactionPayToken>);

      await act(async () => {
        rerender({});
      });

      expect(result.current.hasPrefilled).toBe(true);
      expect(result.current.prefillAmount).toBe('800');
    });
  });

  describe('isLoading', () => {
    it('true when enabled but not yet committed', () => {
      setupMocks({ payToken: null });

      const { result } = runHook();

      expect(result.current.isLoading).toBe(true);
    });

    it('false when not enabled', () => {
      setupMocks({
        prefilledAmountDefault: { enabled: false },
        prefilledAmountOverrides: {},
      });

      const { result } = runHook();

      expect(result.current.isLoading).toBe(false);
    });

    it('false after commit', () => {
      setupMocks();

      const { result } = runHook();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasPrefilled).toBe(true);
    });
  });
});
