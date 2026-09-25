import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  CRYPTO_AUTH_METHODS,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SubscriptionDelegationServiceErrorMessage,
  type PricingResponse,
} from '@metamask/subscription-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import type { SelectedPlusPlan } from '../screens/Benefits/utils/getSelectedPlusPlan';
import { useStartProSubscription } from './useStartProSubscription';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionDelegationService: {
        prepareDelegation: jest.fn(),
      },
      SubscriptionController: {
        state: {
          pricing: undefined,
          trialedProducts: [],
        },
        getSubscriptions: jest.fn(),
        startSubscriptionWithCrypto: jest.fn(),
      },
      AuthenticatedUserStorageService: {
        listDelegations: jest.fn(),
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
const DELEGATION_HASH: Hex = `0x${'12'.repeat(32)}`;

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

const PRICING: PricingResponse = {
  products: [],
  paymentMethods: [
    {
      type: 'crypto',
      cryptoAuthMethod: CRYPTO_AUTH_METHODS.DELEGATION,
      products: [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS],
      chains: [
        {
          chainId: CHAIN_ID,
          paymentAddress: '0x2222222222222222222222222222222222222222',
          tokens: [
            {
              symbol: 'mUSD',
              address: '0x3333333333333333333333333333333333333333',
              decimals: 6,
            },
          ],
        },
      ],
    },
  ],
};

const mockedUseSelector = jest.mocked(useSelector);
const mockedPrepareDelegation = Engine.context.SubscriptionDelegationService
  .prepareDelegation as jest.Mock;
const mockedStartSubscription = Engine.context.SubscriptionController
  .startSubscriptionWithCrypto as jest.Mock;
const mockedGetSubscriptions = Engine.context.SubscriptionController
  .getSubscriptions as jest.Mock;
const mockedListDelegations = Engine.context.AuthenticatedUserStorageService
  .listDelegations as jest.Mock;
const mockedSubscriptionController = Engine.context
  .SubscriptionController as unknown as {
  state: {
    pricing: PricingResponse | undefined;
    trialedProducts: string[];
  };
};

describe('useStartProSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return { address: PAYER_ADDRESS };
      }
      return undefined;
    });
    mockedSubscriptionController.state.pricing = PRICING;
    mockedSubscriptionController.state.trialedProducts = [];
    mockedGetSubscriptions.mockResolvedValue([]);
    mockedListDelegations.mockResolvedValue([
      {
        metadata: {
          delegationHash: DELEGATION_HASH,
          chainIdHex: CHAIN_ID,
          tokenSymbol: 'mUSD',
          tokenAddress: '0x3333333333333333333333333333333333333333',
        },
      },
    ]);
    mockedPrepareDelegation.mockResolvedValue({
      delegationHash: DELEGATION_HASH,
      disposition: 'created',
    });
    mockedStartSubscription.mockResolvedValue({
      subscriptionId: 'subscription-1',
      status: 'trialing',
    });
  });

  it('prepares a delegation before starting the crypto subscription', async () => {
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(PLAN);
    });

    expect(mockedPrepareDelegation).toHaveBeenCalledWith({
      product: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      recurringInterval: RECURRING_INTERVALS.year,
      payerAddress: PAYER_ADDRESS,
      isTrialRequested: true,
      checkBalance: true,
      skipChompInteractions: true,
    });
    expect(mockedGetSubscriptions.mock.invocationCallOrder[0]).toBeLessThan(
      mockedPrepareDelegation.mock.invocationCallOrder[0],
    );
    expect(mockedStartSubscription).toHaveBeenCalledWith({
      products: [PRODUCT_TYPES.MONEY_ACCOUNT_PLUS],
      isTrialRequested: true,
      recurringInterval: RECURRING_INTERVALS.year,
      billingCycles: 1,
      chainId: CHAIN_ID,
      payerAddress: PAYER_ADDRESS,
      tokenSymbol: 'mUSD',
      cryptoAuthMethod: CRYPTO_AUTH_METHODS.DELEGATION,
      delegationHash: DELEGATION_HASH,
    });
  });

  it('stops before delegation preparation when payment context is missing', async () => {
    mockedUseSelector.mockImplementation(() => undefined);
    const { result } = renderHook(() => useStartProSubscription());

    await expect(
      act(async () => {
        await result.current.startSubscription(PLAN);
      }),
    ).rejects.toThrow('Money Account subscription payment is unavailable');

    expect(mockedPrepareDelegation).not.toHaveBeenCalled();
  });

  it('disables the trial for a product that has already been trialed', async () => {
    mockedSubscriptionController.state.trialedProducts = [
      PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    ];
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await result.current.startSubscription(PLAN);
    });

    expect(mockedPrepareDelegation).toHaveBeenCalledWith(
      expect.objectContaining({ isTrialRequested: false }),
    );
    expect(mockedStartSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ isTrialRequested: false }),
    );
  });

  it('rejects pricing that changes during delegation preparation', async () => {
    mockedPrepareDelegation.mockImplementation(async () => {
      mockedSubscriptionController.state.pricing = {
        ...PRICING,
        paymentMethods: [
          {
            ...PRICING.paymentMethods[0],
            type: 'crypto',
            chains: [
              {
                chainId: CHAIN_ID,
                paymentAddress: '0x2222222222222222222222222222222222222222',
                tokens: [
                  {
                    symbol: 'mUSD',
                    address: '0x8888888888888888888888888888888888888888',
                    decimals: 6,
                  },
                ],
              },
            ],
          },
        ],
      };
      return {
        delegationHash: DELEGATION_HASH,
        disposition: 'created',
      };
    });
    const { result } = renderHook(() => useStartProSubscription());
    let thrownError: Error | undefined;

    await act(async () => {
      try {
        await result.current.startSubscription(PLAN);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    expect(thrownError?.message).toBe(
      'Money Account subscription payment is unavailable',
    );
    expect(mockedStartSubscription).not.toHaveBeenCalled();
  });

  it('ignores overlapping subscription attempts', async () => {
    let resolveDelegation: (() => void) | undefined;
    mockedPrepareDelegation.mockReturnValue(
      new Promise((resolve) => {
        resolveDelegation = () =>
          resolve({
            delegationHash: DELEGATION_HASH,
            disposition: 'created',
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
      resolveDelegation?.();
      await firstAttempt;
    });

    expect(overlappingError?.message).toBe(
      'Money Account subscription is already starting',
    );
    expect(mockedPrepareDelegation).toHaveBeenCalledTimes(1);
    expect(mockedStartSubscription).toHaveBeenCalledTimes(1);
  });

  it('logs delegation failures and exposes the join error', async () => {
    const delegationError = new Error('signing rejected');
    mockedPrepareDelegation.mockRejectedValue(delegationError);
    const { result } = renderHook(() => useStartProSubscription());
    let thrownError: Error | undefined;

    await act(async () => {
      try {
        await result.current.startSubscription(PLAN);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    expect(thrownError).toBe(delegationError);
    expect(Logger.error).toHaveBeenCalledWith(
      delegationError,
      expect.objectContaining({
        tags: { feature: 'pro-subscription' },
      }),
    );
    expect(result.current.errorMessage).toBe(
      strings('pro_subscription.join_error'),
    );
    expect(mockedStartSubscription).not.toHaveBeenCalled();
  });

  it('exposes the insufficient-balance message for a failed balance check', async () => {
    const balanceError = new Error(
      SubscriptionDelegationServiceErrorMessage.InsufficientBalance,
    );
    mockedPrepareDelegation.mockRejectedValue(balanceError);
    const { result } = renderHook(() => useStartProSubscription());

    await act(async () => {
      await expect(result.current.startSubscription(PLAN)).rejects.toBe(
        balanceError,
      );
    });

    expect(result.current.errorMessage).toBe(
      strings('pro_subscription.insufficient_balance'),
    );
  });
});
