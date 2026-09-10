import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type SubscriptionBenefitsState,
  type Subscription,
} from '@metamask/subscription-controller';
import type { RootState } from '../reducers';
import configureStore from '../util/test/configureStore';
import Engine from '../core/Engine';
import { __resetForTest } from '../core/Subscription/benefitsResolution';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';
import {
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

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('./useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const ReactNav = jest.requireActual('react');
  return {
    useFocusEffect: (callback: () => void) => {
      ReactNav.useEffect(callback, [callback]);
    },
  };
});

const mockUseMoneyAccountPlusAccess = jest.mocked(useMoneyAccountPlusAccess);
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

const createPlusSubscription = (): Subscription =>
  ({
    id: 'sub-plus',
    currentPeriodStart: '2026-08-15T00:00:00.000Z',
    currentPeriodEnd: '2026-09-15T00:00:00.000Z',
    status: SUBSCRIPTION_STATUSES.active,
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
}: {
  isSignedIn?: boolean;
  isUnlocked?: boolean;
  benefits?: SubscriptionBenefitsState;
} = {}) =>
  ({
    engine: {
      backgroundState: {
        AuthenticationController: { isSignedIn },
        KeyringController: { isUnlocked, keyrings: [] },
        SubscriptionController: {
          subscriptions: [createPlusSubscription()],
          trialedProducts: [],
          ...(benefits ? { benefits } : {}),
        },
      },
    },
  }) as unknown as RootState;

const renderBenefits = (state: RootState) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(state)}>{children}</Provider>
  );

  return renderHook(() => useMoneyAccountPlusBenefits(), { wrapper: Wrapper });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useMoneyAccountPlusBenefits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTest();
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );
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

    const { result } = renderBenefits(createState());
    await flush();

    expect(mockGetBenefits).not.toHaveBeenCalled();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
  });

  it('reports loading while benefits are unresolved and uncached', () => {
    mockGetBenefits.mockReturnValue(new Promise(() => undefined));

    const { result } = renderBenefits(createState());

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Loading);
    expect(result.current.items).toEqual([]);
  });

  it('maps cached benefits after a successful fetch', async () => {
    const { result } = renderBenefits(createState({ benefits: BENEFITS }));
    await flush();

    expect(mockGetBenefits).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);
    expect(result.current.items).toHaveLength(3);
    expect(result.current.benefits).toEqual(BENEFITS);
    expect(result.current.resetsOn).toBe(
      new Date('2026-09-15T00:00:00.000Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    );
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
    await flush();

    expect(result.current.status).toBe(
      MoneyAccountPlusBenefitsStatus.Incomplete,
    );
    expect(result.current.items.map((item) => item.id)).toEqual([
      'swaps',
      'perps',
    ]);
  });

  it('reports error when the fetch fails and no cache exists', async () => {
    mockGetBenefits.mockRejectedValue(new Error('network down'));

    const { result } = renderBenefits(createState());
    await flush();

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Failed);
    expect(result.current.hasError).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it('keeps cached rows when a refresh fails', async () => {
    const { result } = renderBenefits(createState({ benefits: BENEFITS }));
    await flush();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);

    mockGetBenefits.mockRejectedValue(new Error('network down'));
    await act(async () => {
      result.current.retry();
      await Promise.resolve();
    });

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);
    expect(result.current.hasError).toBe(true);
    expect(result.current.items).toHaveLength(3);
  });

  it('retries a failed fetch from the error state', async () => {
    mockGetBenefits.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderBenefits(createState());
    await flush();
    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Failed);

    await act(async () => {
      result.current.retry();
      await Promise.resolve();
    });

    expect(mockGetBenefits).toHaveBeenCalledTimes(2);
  });

  it('clears resolution when the session ends so the next user re-fetches', async () => {
    renderBenefits(createState({ benefits: BENEFITS }));
    await flush();
    expect(mockGetBenefits).toHaveBeenCalledTimes(1);

    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Eligible,
    );
    renderBenefits(createState({ isSignedIn: false, benefits: BENEFITS }));
    await flush();

    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );
    renderBenefits(createState({ benefits: BENEFITS }));
    await flush();

    expect(mockGetBenefits).toHaveBeenCalledTimes(2);
  });
});
