import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
import configureStore from '../../../../util/test/configureStore';
import { useResumeMembership } from './useResumeMembership';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionController: {
        unCancelSubscription: jest.fn(),
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

const mockUnCancelSubscription = Engine.context.SubscriptionController
  .unCancelSubscription as jest.Mock;

const subscription: Subscription = {
  id: 'money-account-plus-subscription',
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      currency: 'usd',
      unitAmount: 9900,
      unitDecimals: 2,
    },
  ],
  currentPeriodStart: '2026-07-20T00:00:00.000Z',
  currentPeriodEnd: '2027-07-20T00:00:00.000Z',
  status: SUBSCRIPTION_STATUSES.active,
  interval: RECURRING_INTERVALS.year,
  paymentMethod: {
    type: PAYMENT_TYPES.byCrypto,
    crypto: {
      payerAddress: '0x1111111111111111111111111111111111111111',
      chainId: '0x1',
      tokenSymbol: 'USDC',
    },
  },
  isEligibleForSupport: true,
};

const createStoreState = (
  membershipSubscription: Subscription = subscription,
) =>
  ({
    engine: {
      backgroundState: {
        SubscriptionController: {
          subscriptions: [membershipSubscription],
          trialedProducts: [],
        },
      },
    },
  }) as unknown as RootState;

const renderResumeHook = (
  membershipSubscription: Subscription = subscription,
) =>
  renderHook(() => useResumeMembership(), {
    wrapper: ({ children }) => (
      <Provider
        store={configureStore(createStoreState(membershipSubscription))}
      >
        {children}
      </Provider>
    ),
  });

describe('useResumeMembership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnCancelSubscription.mockResolvedValue(undefined);
  });

  it('does not offer resume for an active subscription', () => {
    const { result } = renderResumeHook();

    expect(result.current.canResume).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('uncancels the pending subscription', async () => {
    const pendingCancellation: Subscription = {
      ...subscription,
      cancelAtPeriodEnd: true,
    };
    const { result } = renderResumeHook(pendingCancellation);

    expect(result.current.canResume).toBe(true);

    await act(async () => {
      await result.current.resumeMembership();
    });

    expect(mockUnCancelSubscription).toHaveBeenCalledWith({
      subscriptionId: pendingCancellation.id,
    });
    expect(result.current.isResuming).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('ignores a second press while resume is in flight', async () => {
    let resolveResume: (() => void) | undefined;
    mockUnCancelSubscription.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveResume = resolve;
      }),
    );
    const pendingCancellation: Subscription = {
      ...subscription,
      cancelAtPeriodEnd: true,
    };
    const { result } = renderResumeHook(pendingCancellation);

    await act(async () => {
      const firstResume = result.current.resumeMembership();
      const secondResume = result.current.resumeMembership();
      resolveResume?.();
      await firstResume;
      await secondResume;
    });

    expect(mockUnCancelSubscription).toHaveBeenCalledTimes(1);
  });

  it('exposes the resume error when uncancel fails', async () => {
    const startError = new Error('request failed');
    mockUnCancelSubscription.mockRejectedValueOnce(startError);
    const pendingCancellation: Subscription = {
      ...subscription,
      cancelAtPeriodEnd: true,
    };
    const { result } = renderResumeHook(pendingCancellation);

    await act(async () => {
      await result.current.resumeMembership();
    });

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        strings('pro_hub.membership.resume_failed'),
      ),
    );
    expect(Logger.error).toHaveBeenCalledWith(
      startError,
      expect.objectContaining({
        tags: {
          feature: 'money_account_plus',
          operation: 'uncancel_subscription',
        },
      }),
    );
    expect(result.current.isResuming).toBe(false);
  });
});
