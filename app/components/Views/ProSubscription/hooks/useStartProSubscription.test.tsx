import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SubscriptionDelegationServiceErrorMessage,
} from '@metamask/subscription-controller';
import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import Logger from '../../../../util/Logger';
import I18n, { strings } from '../../../../../locales/i18n';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { useMoneyAccountDeposit } from '../../../UI/Money/hooks/useMoneyAccount';
import type { SelectedPlusPlan } from '../screens/Benefits/utils/getSelectedPlusPlan';
import { waitForMembershipTopUp } from '../utils/waitForMembershipTopUp';
import { fetchMembershipFundingRates } from '../utils/membershipFundingAmount';
import {
  buildConfirmMembershipRequestData,
  useStartProSubscription,
} from './useStartProSubscription';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      ApprovalController: {
        add: jest.fn(),
      },
      SubscriptionDelegationService: {
        checkMoneyAccountBalance: jest.fn(),
        startSubscriptionWithDelegation: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../../../UI/Money/hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock('../utils/waitForMembershipTopUp', () => ({
  waitForMembershipTopUp: jest.fn(),
}));

jest.mock('../utils/membershipFundingAmount', () => ({
  ...jest.requireActual('../utils/membershipFundingAmount'),
  fetchMembershipFundingRates: jest.fn(),
}));

jest.mock('uuid', () => ({
  v1: jest.fn(() => '22222222-2222-4222-8222-222222222222'),
  v4: jest.fn(() => '11111111-1111-4111-8111-111111111111'),
  parse: jest.fn(() =>
    Uint8Array.from({ length: 16 }, (_, index) => index + 1),
  ),
}));

const PAYER_ADDRESS: Hex = '0x1111111111111111111111111111111111111111';
const CHAIN_ID: Hex = '0x8f';
const GENERATED_BATCH_ID = '0x0102030405060708090a0b0c0d0e0f10' as Hex;

const FIXED_NOW = new Date('2026-10-16T12:00:00.000Z');
const MEMBERSHIP_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

const formatExpectedMembershipDate = (date: Date): string =>
  date.toLocaleDateString(I18n.locale, MEMBERSHIP_DATE_FORMAT);

const addCalendarMonths = (date: Date, months: number): Date => {
  const monthIndex = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(monthIndex / 12);
  const month = monthIndex % 12;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(date.getDate(), lastDayOfMonth);

  return new Date(
    year,
    month,
    day,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
};

const addYears = (date: Date, years: number): Date =>
  addCalendarMonths(date, years * 12);

const addMonths = (date: Date, months: number): Date =>
  addCalendarMonths(date, months);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const PLAN: SelectedPlusPlan = {
  planId: 'annual',
  product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
  interval: RECURRING_INTERVALS.year,
  currency: 'usd',
  unitAmount: 4999,
  unitDecimals: 2,
  amount: 49.99,
  trialPeriodDays: 14,
};

const MONTHLY_PLAN: SelectedPlusPlan = {
  planId: 'monthly',
  product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
  interval: RECURRING_INTERVALS.month,
  currency: 'usd',
  unitAmount: 499,
  unitDecimals: 2,
  amount: 4.99,
};

const mockedUseSelector = jest.mocked(useSelector);
const mockedCheckBalance = Engine.context.SubscriptionDelegationService
  .checkMoneyAccountBalance as jest.Mock;
const mockedStartSubscription = Engine.context.SubscriptionDelegationService
  .startSubscriptionWithDelegation as jest.Mock;
const mockedApprovalAdd = Engine.context.ApprovalController.add as jest.Mock;
const mockedUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockedWaitForMembershipTopUp = jest.mocked(waitForMembershipTopUp);
const mockedFetchFundingRates = jest.mocked(fetchMembershipFundingRates);
const mockInitiateDeposit = jest.fn();
const mockCancelTopUp = jest.fn();

const VAULT_CONFIG = { chainId: CHAIN_ID, accountantAddress: '0xbase' };
const PREMIUM_VAULT_CONFIG = {
  chainId: CHAIN_ID,
  accountantAddress: '0xpremium',
};

describe('useStartProSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return { address: PAYER_ADDRESS };
      }
      if (selector === selectMoneyAccountVaultConfig) {
        return VAULT_CONFIG;
      }
      if (selector === selectMoneyAccountPremiumVaultConfig) {
        return PREMIUM_VAULT_CONFIG;
      }
      return undefined;
    });
    mockedFetchFundingRates.mockResolvedValue({
      baseRate: BigInt(1_000_000),
      premiumRate: BigInt(1_002_997),
    });
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: true,
      balance: '100000000',
      requiredBalance: '49990000',
    });
    mockedStartSubscription.mockResolvedValue({
      subscriptionId: 'subscription-1',
      status: 'trialing',
    });
    mockedApprovalAdd.mockResolvedValue(undefined);
    mockedUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    mockedWaitForMembershipTopUp.mockReturnValue({
      promise: Promise.resolve({ id: 'tx-1' } as never),
      cancel: mockCancelTopUp,
    });
    mockInitiateDeposit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts the subscription via startSubscriptionWithDelegation after membership consent', async () => {
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(PLAN);
    });

    expect(mockedCheckBalance).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: RECURRING_INTERVALS.year,
      payerAddress: PAYER_ADDRESS,
    });
    expect(mockedApprovalAdd).toHaveBeenCalledWith({
      id: expect.any(String),
      origin: ORIGIN_METAMASK,
      type: ApprovalTypes.CONFIRM_MEMBERSHIP,
      requestData: {
        monthlyAmount: '4.17',
        totalAmount: '49.99',
        renewDate: formatExpectedMembershipDate(addYears(FIXED_NOW, 1)),
      },
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
    expect(mockedWaitForMembershipTopUp).not.toHaveBeenCalled();
    expect(mockedStartSubscription).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: RECURRING_INTERVALS.year,
      chainId: CHAIN_ID,
      payerAddress: PAYER_ADDRESS,
    });
    expect(mockedCheckBalance.mock.invocationCallOrder[0]).toBeLessThan(
      mockedApprovalAdd.mock.invocationCallOrder[0],
    );
    expect(mockedApprovalAdd.mock.invocationCallOrder[0]).toBeLessThan(
      mockedStartSubscription.mock.invocationCallOrder[0],
    );
  });

  it('does not start delegation, log, or set an error when membership consent is rejected', async () => {
    const rejection = providerErrors.userRejectedRequest();
    mockedApprovalAdd.mockRejectedValue(rejection);
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toBe(
        rejection,
      );
    });

    expect(mockedStartSubscription).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('includes trial fields on the membership consent when isTrial is true', async () => {
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(PLAN, { isTrial: true });
    });

    const billedOn = formatExpectedMembershipDate(addDays(FIXED_NOW, 14));
    expect(mockedApprovalAdd).toHaveBeenCalledWith({
      id: expect.any(String),
      origin: ORIGIN_METAMASK,
      type: ApprovalTypes.CONFIRM_MEMBERSHIP,
      requestData: {
        monthlyAmount: '4.17',
        totalAmount: '49.99',
        renewDate: billedOn,
        isTrial: true,
        billedOn,
      },
    });
  });

  it('uses the plan amount for both monthly and total on a monthly plan', async () => {
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(MONTHLY_PLAN);
    });

    expect(mockedApprovalAdd).toHaveBeenCalledWith({
      id: expect.any(String),
      origin: ORIGIN_METAMASK,
      type: ApprovalTypes.CONFIRM_MEMBERSHIP,
      requestData: {
        monthlyAmount: '4.99',
        totalAmount: '4.99',
        renewDate: formatExpectedMembershipDate(addMonths(FIXED_NOW, 1)),
      },
    });
  });

  it('funds a fresh $4.99 checkout with the vault rounding add-on at 6-decimal precision', async () => {
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '0',
      requiredBalance: '4990000',
    });
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(MONTHLY_PLAN);
    });

    expect(mockedFetchFundingRates).toHaveBeenCalledWith(
      VAULT_CONFIG,
      PREMIUM_VAULT_CONFIG,
    );
    expect(mockInitiateDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '4.990013' }),
    );
  });

  it('does not open the top-up when the vault rates cannot be read', async () => {
    const rateError = new Error('rpc unavailable');
    mockedFetchFundingRates.mockRejectedValue(rateError);
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '0',
      requiredBalance: '4990000',
    });
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(MONTHLY_PLAN)).rejects.toBe(
        rateError,
      );
    });

    expect(mockInitiateDeposit).not.toHaveBeenCalled();
    expect(mockedStartSubscription).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe(
      strings('pro_subscription.join_error'),
    );
  });

  it('tops up the shortfall then starts the subscription when balance is insufficient', async () => {
    let resolveTopUp: (() => void) | undefined;
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '10000000',
      requiredBalance: '49990000',
    });
    mockedWaitForMembershipTopUp.mockReturnValue({
      promise: new Promise((resolve) => {
        resolveTopUp = () => resolve({ id: 'tx-1' } as never);
      }),
      cancel: mockCancelTopUp,
    });

    const { result } = renderHook(() => useStartProSubscription());

    let startPromise: Promise<void> | undefined;
    await act(async () => {
      startPromise = result.current.startSubscription(PLAN);
      await Promise.resolve();
    });

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      batchId: GENERATED_BATCH_ID,
      amount: '39.990083',
      transactionType: TransactionType.membershipSubscription,
      forceBottomSheet: true,
    });
    expect(mockedWaitForMembershipTopUp).toHaveBeenCalledWith(
      GENERATED_BATCH_ID,
    );
    expect(mockedApprovalAdd).not.toHaveBeenCalled();
    expect(mockedStartSubscription).not.toHaveBeenCalled();

    await act(async () => {
      resolveTopUp?.();
      await startPromise;
    });

    expect(mockedStartSubscription).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: RECURRING_INTERVALS.year,
      chainId: CHAIN_ID,
      payerAddress: PAYER_ADDRESS,
    });
  });

  it('does not start delegation, log, or set an error when the top-up is rejected', async () => {
    const rejection = new Error('User rejected the request');
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '0',
      requiredBalance: '49990000',
    });
    mockedWaitForMembershipTopUp.mockReturnValue({
      promise: Promise.reject(rejection),
      cancel: mockCancelTopUp,
    });

    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toBe(
        rejection,
      );
    });

    expect(mockedStartSubscription).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('exposes the join error when the top-up fails', async () => {
    const topUpError = new Error('relay quote failed');
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '0',
      requiredBalance: '49990000',
    });
    mockedWaitForMembershipTopUp.mockReturnValue({
      promise: Promise.reject(topUpError),
      cancel: mockCancelTopUp,
    });

    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toBe(
        topUpError,
      );
    });

    expect(mockedStartSubscription).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      topUpError,
      expect.objectContaining({
        tags: { feature: 'pro-subscription' },
      }),
    );
    expect(result.current.errorMessage).toBe(
      strings('pro_subscription.join_error'),
    );
  });

  it('cancels the top-up waiter when initiateDeposit throws', async () => {
    const setupError = new Error('deposit setup failed');
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '0',
      requiredBalance: '49990000',
    });
    mockInitiateDeposit.mockRejectedValue(setupError);

    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toBe(
        setupError,
      );
    });

    expect(mockCancelTopUp).toHaveBeenCalledTimes(1);
    expect(mockedStartSubscription).not.toHaveBeenCalled();
  });

  it('resolves without navigating after the subscription starts', async () => {
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(
        result.current.startSubscription(PLAN),
      ).resolves.toBeUndefined();
    });

    expect(mockedStartSubscription).toHaveBeenCalledTimes(1);
  });

  it('stops when the Money Account address is missing', async () => {
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectMoneyAccountVaultConfig) {
        return { chainId: CHAIN_ID };
      }
      return undefined;
    });
    const { result } = renderHook(() => useStartProSubscription());

    await expect(
      act(async () => {
        await result.current.startSubscription(PLAN);
      }),
    ).rejects.toThrow('Money Account subscription payment is unavailable');

    expect(mockedCheckBalance).not.toHaveBeenCalled();
    expect(mockedStartSubscription).not.toHaveBeenCalled();
  });

  it('stops when the vault chain id is missing', async () => {
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return { address: PAYER_ADDRESS };
      }
      return undefined;
    });
    const { result } = renderHook(() => useStartProSubscription());

    await expect(
      act(async () => {
        await result.current.startSubscription(PLAN);
      }),
    ).rejects.toThrow('Money Account subscription payment is unavailable');

    expect(mockedCheckBalance).not.toHaveBeenCalled();
    expect(mockedStartSubscription).not.toHaveBeenCalled();
  });

  it('rejects overlapping subscription attempts', async () => {
    let resolveStart: (() => void) | undefined;
    mockedStartSubscription.mockReturnValue(
      new Promise((resolve) => {
        resolveStart = () =>
          resolve({
            subscriptionId: 'subscription-1',
            status: 'trialing',
          });
      }),
    );
    const { result } = renderHook(() => useStartProSubscription());
    let overlappingError: Error | undefined;

    await act(async () => {
      const firstAttempt = result.current.startSubscription(PLAN);
      const secondAttempt = result.current.startSubscription(PLAN);
      try {
        await secondAttempt;
      } catch (error) {
        overlappingError = error as Error;
      }
      resolveStart?.();
      await firstAttempt;
    });

    expect(overlappingError?.message).toBe(
      'Money Account subscription is already starting',
    );
    expect(mockedStartSubscription).toHaveBeenCalledTimes(1);
  });

  it('logs failures and exposes the join error', async () => {
    const startError = new Error('signing rejected');
    mockedStartSubscription.mockRejectedValue(startError);
    const { result } = renderHook(() => useStartProSubscription());
    let thrownError: Error | undefined;

    await act(async () => {
      try {
        await result.current.startSubscription(PLAN);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    expect(thrownError).toBe(startError);
    expect(Logger.error).toHaveBeenCalledWith(
      startError,
      expect.objectContaining({
        tags: { feature: 'pro-subscription' },
      }),
    );
    expect(result.current.errorMessage).toBe(
      strings('pro_subscription.join_error'),
    );
    expect(result.current.errorMessage).not.toMatch(/missing/i);
  });

  it('logs the underlying subscription request error', async () => {
    const cause = new Error(
      'error: invalid delegation, statusCode: 400, errorCode: INVALID_DELEGATION',
    );
    cause.name = 'HttpError';
    Object.assign(cause, { httpStatus: 400 });
    const startError = new Error(
      'Failed to make request. Failed to start subscription with crypto (url: https://subscription.dev-api.cx.metamask.io/v1/subscriptions/crypto)',
    );
    startError.name = 'SubscriptionServiceError';
    startError.cause = cause;
    mockedStartSubscription.mockRejectedValue(startError);
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toBe(
        startError,
      );
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'SubscriptionServiceError',
        message:
          'Failed to make request. Failed to start subscription with crypto (url: https://subscription.dev-api.cx.metamask.io/v1/subscriptions/crypto) | cause: HttpError: error: invalid delegation, statusCode: 400, errorCode: INVALID_DELEGATION, httpStatus: 400',
      }),
      expect.objectContaining({
        extras: {
          cause:
            'HttpError: error: invalid delegation, statusCode: 400, errorCode: INVALID_DELEGATION, httpStatus: 400',
        },
      }),
    );
  });

  it('exposes the insufficient-balance message when startSubscriptionWithDelegation reports it', async () => {
    mockedStartSubscription.mockRejectedValue(
      new Error(SubscriptionDelegationServiceErrorMessage.InsufficientBalance),
    );
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toThrow(
        SubscriptionDelegationServiceErrorMessage.InsufficientBalance,
      );
    });

    expect(result.current.errorMessage).toBe(
      strings('pro_subscription.insufficient_balance'),
    );
    expect(result.current.errorMessage).not.toMatch(/missing/i);
  });
});

describe('buildConfirmMembershipRequestData', () => {
  it.each([
    ['January 31, 2026', new Date(2026, 0, 31, 12), new Date(2026, 1, 28, 12)],
    ['January 30, 2026', new Date(2026, 0, 30, 12), new Date(2026, 1, 28, 12)],
    ['January 29, 2026', new Date(2026, 0, 29, 12), new Date(2026, 1, 28, 12)],
    ['January 31, 2024', new Date(2024, 0, 31, 12), new Date(2024, 1, 29, 12)],
    ['March 31, 2026', new Date(2026, 2, 31, 12), new Date(2026, 3, 30, 12)],
    [
      'December 31, 2026',
      new Date(2026, 11, 31, 12),
      new Date(2027, 0, 31, 12),
    ],
  ])(
    'clamps the monthly renew date to the last day of the next month for %s',
    (_label, checkoutDate, expectedRenewDate) => {
      const requestData = buildConfirmMembershipRequestData(
        MONTHLY_PLAN,
        false,
        checkoutDate,
      );

      expect(requestData.renewDate).toBe(
        formatExpectedMembershipDate(expectedRenewDate),
      );
    },
  );

  it('clamps an annual renew date to February 28 when checkout is February 29', () => {
    const checkoutDate = new Date(2024, 1, 29, 12);

    const requestData = buildConfirmMembershipRequestData(
      PLAN,
      false,
      checkoutDate,
    );

    expect(requestData.renewDate).toBe(
      formatExpectedMembershipDate(new Date(2025, 1, 28, 12)),
    );
  });

  it('keeps the checkout day when the next month contains it', () => {
    const checkoutDate = new Date(2026, 0, 15, 12);

    const requestData = buildConfirmMembershipRequestData(
      MONTHLY_PLAN,
      false,
      checkoutDate,
    );

    expect(requestData.renewDate).toBe(
      formatExpectedMembershipDate(new Date(2026, 1, 15, 12)),
    );
  });
});
