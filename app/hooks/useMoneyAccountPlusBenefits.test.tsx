import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type SubscriptionBenefitsState,
  type Subscription,
} from '@metamask/subscription-controller';
import type { RootState } from '../reducers';
import configureStore from '../util/test/configureStore';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from './useMoneyAccountPlusBenefits';

jest.mock('./useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('./useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: jest.fn(),
}));

const mockUseMoneyAccountPlusAccess = jest.mocked(useMoneyAccountPlusAccess);

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
  benefits,
}: {
  benefits?: SubscriptionBenefitsState;
} = {}) =>
  ({
    engine: {
      backgroundState: {
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

describe('useMoneyAccountPlusBenefits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );
  });

  it('returns empty for a non-subscriber', () => {
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Eligible,
    );

    const { result } = renderBenefits(createState({ benefits: BENEFITS }));

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Empty);
    expect(result.current.items).toEqual([]);
    expect(result.current.resetsOn).toBeUndefined();
  });

  it('returns empty when persisted benefits are missing', () => {
    const { result } = renderBenefits(createState());

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Empty);
    expect(result.current.items).toEqual([]);
  });

  it('maps cached benefits for a subscriber', () => {
    const { result } = renderBenefits(createState({ benefits: BENEFITS }));

    expect(result.current.status).toBe(MoneyAccountPlusBenefitsStatus.Ready);
    expect(result.current.items).toHaveLength(3);
    expect(result.current.resetsOn).toBe(
      new Date('2026-09-15T00:00:00.000Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    );
  });

  it('reports partial when a product cannot be mapped', () => {
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

    expect(result.current.status).toBe(
      MoneyAccountPlusBenefitsStatus.Incomplete,
    );
    expect(result.current.items.map((item) => item.id)).toEqual([
      'swaps',
      'perps',
    ]);
  });
});
