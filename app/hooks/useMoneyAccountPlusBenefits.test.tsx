import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type SubscriptionBenefitsState,
  type Subscription,
} from '@metamask/subscription-controller';
import type { RootState } from '../reducers';
import configureStore from '../util/test/configureStore';
import Engine from '../core/Engine';
import { selectIsSignedIn } from '../selectors/identity';
import { selectIsUnlocked } from '../selectors/keyringController';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';
import {
  BENEFITS_QUERY_KEY,
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from './useMoneyAccountPlusBenefits';

jest.mock('../core/Engine', () => ({
  context: {
    SubscriptionController: {
      getBenefits: jest.fn(),
    },
  },
}));

jest.mock('./useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('./useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: jest.fn(),
}));

jest.mock('../selectors/identity', () => ({
  ...jest.requireActual('../selectors/identity'),
  selectIsSignedIn: jest.fn(),
}));

jest.mock('../selectors/keyringController', () => ({
  ...jest.requireActual('../selectors/keyringController'),
  selectIsUnlocked: jest.fn(),
}));

const mockUseMoneyAccountPlusAccess = jest.mocked(useMoneyAccountPlusAccess);
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
    builderCode: 'code',
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
    currentPeriodStart: '2026-08-15T00:00:00.000Z',
    currentPeriodEnd: '2026-09-15T00:00:00.000Z',
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

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(state)}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  return renderHook(() => useMoneyAccountPlusBenefits(), { wrapper: Wrapper });
};

describe('useMoneyAccountPlusBenefits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );
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
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Eligible,
    );

    const { result } = renderBenefits(
      createState({ hasPlusSubscription: false }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
  });

  it('does not fetch benefits while Plus access is unknown', () => {
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Unknown,
    );

    const { result } = renderBenefits(
      createState({ hasPlusSubscription: false }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
  });

  it('keeps cached rows without fetching for an entitled past_due subscriber', async () => {
    const { result } = renderBenefits(
      createState({
        benefits: BENEFITS,
        subscriptionStatus: SUBSCRIPTION_STATUSES.pastDue,
      }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);
    expect(result.current.items).toHaveLength(3);
    expect(result.current.resetsOn).toBe('Sep 15, 2026');
  });

  it('reports empty without fetching when an entitled past_due subscriber has no cache', () => {
    const { result } = renderBenefits(
      createState({
        subscriptionStatus: SUBSCRIPTION_STATUSES.pastDue,
      }),
    );

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Empty);
    expect(result.current.items).toEqual([]);
  });

  it('does not fetch benefits when the user is signed out', () => {
    renderBenefits(createState({ isSignedIn: false }));

    expect(mockGetBenefits).not.toHaveBeenCalled();
  });

  it('does not fetch benefits when the keyring is locked', () => {
    renderBenefits(createState({ isUnlocked: false }));

    expect(mockGetBenefits).not.toHaveBeenCalled();
  });

  it('reports loading while benefits are unresolved and uncached', () => {
    mockGetBenefits.mockReturnValue(new Promise(() => undefined));

    const { result } = renderBenefits(createState());

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
    expect(result.current.items).toEqual([]);
  });

  it('maps cached benefits after a successful fetch', async () => {
    const { result } = renderBenefits(createState({ benefits: BENEFITS }));

    await waitFor(() =>
      expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready),
    );

    expect(mockGetBenefits).toHaveBeenCalledTimes(1);
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

    await waitFor(() =>
      expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready),
    );

    mockGetBenefits.mockRejectedValue(new Error('network down'));
    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(mockGetBenefits).toHaveBeenCalledTimes(2));

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
    const state = createState({ benefits: BENEFITS });
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
      rerender();
    });

    await waitFor(() =>
      expect(queryClient.getQueryData(BENEFITS_QUERY_KEY)).toBeUndefined(),
    );

    mockSelectIsSignedIn.mockReturnValue(true);
    await act(async () => {
      rerender();
    });

    await waitFor(() => expect(mockGetBenefits).toHaveBeenCalledTimes(2));
  });
});
