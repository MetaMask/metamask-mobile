import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  SubscriptionControllerErrorMessage,
  type SubscriptionBenefitsState,
  type Subscription,
} from '@metamask/subscription-controller';
import type { RootState } from '../../../../reducers';
import configureStore from '../../../../util/test/configureStore';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import Logger from '../../../../util/Logger';
import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccessState,
} from '../../../../hooks/useMoneyAccountPlusAccess';
import {
  BENEFITS_QUERY_KEY,
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from './useMoneyAccountPlusBenefits';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    SubscriptionController: {
      getBenefits: jest.fn(),
    },
  },
}));

jest.mock('../../../../hooks/useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('../../../../hooks/useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccessState: jest.fn(),
}));

jest.mock('../../../../selectors/identity', () => ({
  ...jest.requireActual('../../../../selectors/identity'),
  selectIsSignedIn: jest.fn(),
}));

jest.mock('../../../../selectors/keyringController', () => ({
  ...jest.requireActual('../../../../selectors/keyringController'),
  selectIsUnlocked: jest.fn(),
}));

const mockUseMoneyAccountPlusAccessState = jest.mocked(
  useMoneyAccountPlusAccessState,
);

const mockAccess = (
  access: MoneyAccountPlusAccess,
  isSubscriptionsSettled = true,
) => {
  mockUseMoneyAccountPlusAccessState.mockReturnValue({
    access,
    isSubscriptionsSettled,
  });
};
const mockSelectIsSignedIn = jest.mocked(selectIsSignedIn);
const mockSelectIsUnlocked = jest.mocked(selectIsUnlocked);
const mockGetBenefits = jest.mocked(
  Engine.context.SubscriptionController.getBenefits,
);

const BENEFITS: SubscriptionBenefitsState = {
  billingPeriodId: 'bp_2026_08_15',
  swaps: {
    feeBips: '0',
    capMicroUsd: 500_000_000,
    consumedMicroUsd: 310_000_000,
    remainingMicroUsd: 190_000_000,
    exhausted: false,
  },
  perps: {
    builderFeeBips: '0',
    capMicroUsd: 1_000_000_000,
    consumedMicroUsd: 240_000_000,
    remainingMicroUsd: 760_000_000,
    exhausted: false,
  },
  predict: {
    builderCode: 'code',
    capTxCount: 1,
    consumedTxCount: 0,
    remainingTxCount: 1,
    exhausted: false,
  },
};

const createPlusSubscription = (
  status: Subscription['status'] = SUBSCRIPTION_STATUSES.active,
): Subscription =>
  ({
    id: 'sub-plus',
    currentPeriodStart: '2026-08-15T12:00:00.000Z',
    currentPeriodEnd: '2026-09-15T12:00:00.000Z',
    status,
    products: [
      {
        name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
        currency: 'usd',
        unitAmount: 499,
        unitDecimals: 2,
      },
    ],
  }) as Subscription;

const createState = ({
  isSignedIn = true,
  isUnlocked = true,
  benefits,
  subscriptionStatus = SUBSCRIPTION_STATUSES.active,
  hasPlusSubscription = true,
}: {
  isSignedIn?: boolean;
  isUnlocked?: boolean;
  benefits?: SubscriptionBenefitsState;
  subscriptionStatus?: Subscription['status'];
  hasPlusSubscription?: boolean;
} = {}) =>
  ({
    engine: {
      backgroundState: {
        AuthenticationController: { isSignedIn },
        KeyringController: { isUnlocked, keyrings: [] },
        SubscriptionController: {
          subscriptions: hasPlusSubscription
            ? [createPlusSubscription(subscriptionStatus)]
            : [],
          trialedProducts: [],
          ...(benefits ? { benefits } : {}),
        },
      },
    },
  }) as unknown as RootState;

const createQueryClient = (staleTime = 0) =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime } },
  });

const applyAuthFromState = (state: RootState) => {
  mockSelectIsSignedIn.mockReturnValue(
    Boolean(state.engine.backgroundState.AuthenticationController?.isSignedIn),
  );
  mockSelectIsUnlocked.mockReturnValue(
    Boolean(state.engine.backgroundState.KeyringController?.isUnlocked),
  );
};

const renderBenefits = (state: RootState) => {
  applyAuthFromState(state);

  const queryClient = createQueryClient();
  const store = configureStore(state);

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  return {
    store,
    ...renderHook(() => useMoneyAccountPlusBenefits(), { wrapper: Wrapper }),
  };
};

const setSubscriptionStatus = (status: Subscription['status']) => {
  Object.assign(Engine, {
    state: {
      SubscriptionController: {
        subscriptions: [createPlusSubscription(status)],
        trialedProducts: [],
      },
    },
  });
};

describe('useMoneyAccountPlusBenefits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Reflect.deleteProperty(Engine, 'state');
    mockAccess(MoneyAccountPlusAccess.Subscriber);
    mockSelectIsSignedIn.mockReturnValue(true);
    mockSelectIsUnlocked.mockReturnValue(true);
    mockGetBenefits.mockResolvedValue({
      eligible: true,
      billingPeriodId: BENEFITS.billingPeriodId,
      products: {
        swaps: BENEFITS.swaps,
        perps: BENEFITS.perps,
        predict: BENEFITS.predict,
      },
    });
  });

  it('does not fetch benefits for a non-subscriber', async () => {
    mockAccess(MoneyAccountPlusAccess.Eligible);

    const { result } = renderBenefits(
      createState({ hasPlusSubscription: false }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
  });

  it('does not fetch benefits while Plus access is unknown', () => {
    mockAccess(MoneyAccountPlusAccess.Unknown, false);

    const { result } = renderBenefits(
      createState({ hasPlusSubscription: false }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
  });

  it('hides the section without fetching for an entitled past_due subscriber with a persisted snapshot', () => {
    const { result } = renderBenefits(
      createState({
        benefits: BENEFITS,
        subscriptionStatus: SUBSCRIPTION_STATUSES.pastDue,
      }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Empty);
    expect(result.current.items).toEqual([]);
    expect(result.current.resetsOn).toBeUndefined();
  });

  it('hides the section without fetching when an entitled past_due subscriber has no snapshot', () => {
    const { result } = renderBenefits(
      createState({
        subscriptionStatus: SUBSCRIPTION_STATUSES.pastDue,
      }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Empty);
    expect(result.current.items).toEqual([]);
  });

  it('hides the section for an entitled past_due subscriber even before subscriptions settle', () => {
    mockAccess(MoneyAccountPlusAccess.Subscriber, false);

    const { result } = renderBenefits(
      createState({
        benefits: BENEFITS,
        subscriptionStatus: SUBSCRIPTION_STATUSES.pastDue,
      }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Empty);
  });

  it('does not fetch benefits when the user is signed out', () => {
    renderBenefits(createState({ isSignedIn: false }));

    expect(mockGetBenefits).not.toHaveBeenCalled();
  });

  it('does not fetch benefits when the keyring is locked', () => {
    renderBenefits(createState({ isUnlocked: false }));

    expect(mockGetBenefits).not.toHaveBeenCalled();
  });

  it('reports loading while the subscriptions refresh is in flight', () => {
    mockAccess(MoneyAccountPlusAccess.Subscriber, false);

    const { result } = renderBenefits(createState());

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
    expect(result.current.items).toEqual([]);
  });

  it('fetches benefits once when the subscriptions refresh left no snapshot', async () => {
    renderBenefits(createState());

    await waitFor(() => expect(mockGetBenefits).toHaveBeenCalledTimes(1));
  });

  it('maps cached benefits without fetching again', () => {
    const { result } = renderBenefits(createState({ benefits: BENEFITS }));

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);
    expect(result.current.items).toHaveLength(3);
    expect(result.current.resetsOn).toBe('Sep 15, 2026');
  });

  it('reports partial when a product cannot be mapped', async () => {
    const { result } = renderBenefits(
      createState({
        benefits: {
          ...BENEFITS,
          predict: {
            builderCode: 'code',
            remainingTxCount: null,
            exhausted: false,
          },
        },
      }),
    );

    await waitFor(() =>
      expect(result.current.status).toBe(
        MoneyAccountPlusBenefitsStatus.Incomplete,
      ),
    );

    expect(result.current.items.map((item) => item.id)).toEqual([
      'swaps',
      'perps',
    ]);
  });

  it('shows pending confirmation when a provisional subscriber is not eligible yet', async () => {
    mockGetBenefits.mockRejectedValue(
      new Error(SubscriptionControllerErrorMessage.UserNotSubscribed),
    );

    const { result } = renderBenefits(
      createState({
        subscriptionStatus: SUBSCRIPTION_STATUSES.provisional,
      }),
    );

    await waitFor(() =>
      expect(result.current.status).toBe(
        MoneyAccountPlusBenefitsStatus.Pending,
      ),
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.resetsOn).toBeUndefined();
  });

  it('refetches benefits when a provisional membership becomes active', async () => {
    let rejectConfirmedRequest: (error: Error) => void = () => undefined;
    mockGetBenefits.mockRejectedValueOnce(
      new Error(SubscriptionControllerErrorMessage.UserNotSubscribed),
    );
    mockGetBenefits.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectConfirmedRequest = reject;
        }),
    );

    const { result, store } = renderBenefits(
      createState({
        subscriptionStatus: SUBSCRIPTION_STATUSES.provisional,
      }),
    );

    await waitFor(() =>
      expect(result.current.status).toBe(
        MoneyAccountPlusBenefitsStatus.Pending,
      ),
    );
    expect(mockGetBenefits).toHaveBeenCalledTimes(1);
    expect(Logger.error).not.toHaveBeenCalled();

    setSubscriptionStatus(SUBSCRIPTION_STATUSES.active);
    await act(async () => {
      store.dispatch(updateBgState({ key: 'SubscriptionController' }));
    });

    expect(mockGetBenefits).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
    expect(Logger.error).not.toHaveBeenCalled();

    await act(async () => {
      rejectConfirmedRequest(
        new Error(SubscriptionControllerErrorMessage.UserNotSubscribed),
      );
      // React Query notifies observers on a timeout. Flush it inside act.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    await waitFor(() =>
      expect(result.current.status).toBe(
        MoneyAccountPlusBenefitsStatus.Unavailable,
      ),
    );
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });

  it.each([SUBSCRIPTION_STATUSES.active, SUBSCRIPTION_STATUSES.trialing])(
    'reports unavailable when a %s subscriber is not eligible',
    async (subscriptionStatus) => {
      mockGetBenefits.mockRejectedValue(
        new Error(SubscriptionControllerErrorMessage.UserNotSubscribed),
      );

      const { result } = renderBenefits(
        createState({
          subscriptionStatus,
        }),
      );

      await waitFor(() =>
        expect(result.current.status).toBe(
          MoneyAccountPlusBenefitsStatus.Unavailable,
        ),
      );
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SubscriptionControllerErrorMessage.UserNotSubscribed,
        }),
        expect.objectContaining({
          tags: expect.objectContaining({
            operation: 'benefits_not_eligible',
          }),
        }),
      );
    },
  );

  it('shows pending confirmation when a provisional benefits response is incomplete', async () => {
    const incompleteResponse = new Error(
      'At path: products.perps.builderCode -- Expected a string, but received: undefined',
    );
    incompleteResponse.name = 'StructError';
    mockGetBenefits.mockRejectedValue(incompleteResponse);

    const { result } = renderBenefits(
      createState({
        subscriptionStatus: SUBSCRIPTION_STATUSES.provisional,
      }),
    );

    await waitFor(() =>
      expect(result.current.status).toBe(
        MoneyAccountPlusBenefitsStatus.Pending,
      ),
    );
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('keeps the error state when a confirmed subscriber gets an incomplete benefits response', async () => {
    const incompleteResponse = new Error(
      'At path: products.perps.builderCode -- Expected a string, but received: undefined',
    );
    incompleteResponse.name = 'StructError';
    mockGetBenefits.mockRejectedValue(incompleteResponse);

    const { result } = renderBenefits(createState());

    await waitFor(() =>
      expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Failed),
    );
  });

  it('keeps the error state when a provisional subscriber hits a real load failure', async () => {
    mockGetBenefits.mockRejectedValue(new Error('network down'));

    const { result } = renderBenefits(
      createState({
        subscriptionStatus: SUBSCRIPTION_STATUSES.provisional,
      }),
    );

    await waitFor(() =>
      expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Failed),
    );
  });

  it('reports error when the fetch fails and no cache exists', async () => {
    mockGetBenefits.mockRejectedValue(new Error('network down'));

    const { result } = renderBenefits(createState());

    await waitFor(() =>
      expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Failed),
    );

    expect(result.current.items).toEqual([]);
  });

  it('keeps cached rows when a refresh fails', async () => {
    const { result } = renderBenefits(createState({ benefits: BENEFITS }));

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);

    mockGetBenefits.mockRejectedValue(new Error('network down'));
    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(mockGetBenefits).toHaveBeenCalledTimes(1));

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);
    expect(result.current.items).toHaveLength(3);
  });

  it('retries a failed fetch from the error state', async () => {
    mockGetBenefits.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderBenefits(createState());

    await waitFor(() =>
      expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Failed),
    );

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(mockGetBenefits).toHaveBeenCalledTimes(2));
  });

  it('clears the query when the session ends so the next subscriber re-fetches', async () => {
    const queryClient = createQueryClient(Infinity);
    const state = createState();
    applyAuthFromState(state);

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={configureStore(state)}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    );

    const { rerender } = renderHook(() => useMoneyAccountPlusBenefits(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(mockGetBenefits).toHaveBeenCalledTimes(1));

    mockSelectIsSignedIn.mockReturnValue(false);
    await act(async () => {
      rerender(undefined);
    });

    await waitFor(() =>
      expect(queryClient.getQueryData(BENEFITS_QUERY_KEY)).toBeUndefined(),
    );

    mockSelectIsSignedIn.mockReturnValue(true);
    await act(async () => {
      rerender(undefined);
    });

    await waitFor(() => expect(mockGetBenefits).toHaveBeenCalledTimes(2));
  });
});
