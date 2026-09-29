import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SubscriptionDelegationServiceErrorMessage,
} from '@metamask/subscription-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import type { SelectedPlusPlan } from '../screens/Benefits/utils/getSelectedPlusPlan';
import { useStartProSubscription } from './useStartProSubscription';

const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
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

const PAYER_ADDRESS: Hex = '0x1111111111111111111111111111111111111111';
const CHAIN_ID: Hex = '0x8f';

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

const mockedUseSelector = jest.mocked(useSelector);
const mockedCheckBalance = Engine.context.SubscriptionDelegationService
  .checkMoneyAccountBalance as jest.Mock;
const mockedStartSubscription = Engine.context.SubscriptionDelegationService
  .startSubscriptionWithDelegation as jest.Mock;

describe('useStartProSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return { address: PAYER_ADDRESS };
      }
      if (selector === selectMoneyAccountVaultConfig) {
        return { chainId: CHAIN_ID };
      }
      return undefined;
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
  });

  it('starts the subscription via startSubscriptionWithDelegation', async () => {
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(PLAN);
    });

    expect(mockedCheckBalance).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: RECURRING_INTERVALS.year,
      payerAddress: PAYER_ADDRESS,
    });
    expect(mockedStartSubscription).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: RECURRING_INTERVALS.year,
      chainId: CHAIN_ID,
      payerAddress: PAYER_ADDRESS,
      skipApproval: true,
    });
    expect(mockedCheckBalance.mock.invocationCallOrder[0]).toBeLessThan(
      mockedStartSubscription.mock.invocationCallOrder[0],
    );
  });

  it('opens Pro Hub after the subscription starts', async () => {
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(PLAN);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT);
    expect(mockedStartSubscription.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0],
    );
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
    expect(mockReplace).not.toHaveBeenCalled();
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
    expect(mockReplace).not.toHaveBeenCalled();
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
    expect(mockReplace).not.toHaveBeenCalled();
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

  it('exposes the insufficient-balance message for a failed balance check', async () => {
    mockedCheckBalance.mockResolvedValue({
      hasSufficientBalance: false,
      balance: '0',
      requiredBalance: '49990000',
    });
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toThrow(
        SubscriptionDelegationServiceErrorMessage.InsufficientBalance,
      );
    });

    expect(mockedStartSubscription).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe(
      strings('pro_subscription.insufficient_balance'),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
