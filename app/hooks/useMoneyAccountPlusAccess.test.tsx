import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  PRODUCT_TYPES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import type { RootState } from '../reducers';
import configureStore from '../util/test/configureStore';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

jest.mock('./useProSubscriptionEnabled');

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);

const createSubscription = (status: Subscription['status']) => ({
  id: 'sub-plus',
  status,
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      currency: 'usd',
      unitAmount: 499,
      unitDecimals: 2,
    },
  ],
});

const createState = (status?: Subscription['status']) =>
  ({
    engine: {
      backgroundState: {
        SubscriptionController: {
          subscriptions: status ? [createSubscription(status)] : [],
          trialedProducts: [],
        },
      },
    },
  }) as unknown as RootState;

const renderAccess = (state: RootState) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(state)}>{children}</Provider>
  );

  return renderHook(() => useMoneyAccountPlusAccess(), { wrapper: Wrapper });
};

describe('useMoneyAccountPlusAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
      variantName: 'treatment',
      isActive: true,
    });
  });

  it('is disabled when the Pro subscription flag is off', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
      variantName: 'control',
      isActive: false,
    });

    const { result } = renderAccess(createState(SUBSCRIPTION_STATUSES.active));

    expect(result.current).toBe(MoneyAccountPlusAccess.Disabled);
  });

  it.each([
    SUBSCRIPTION_STATUSES.active,
    SUBSCRIPTION_STATUSES.trialing,
    SUBSCRIPTION_STATUSES.provisional,
  ])('grants subscriber access for %s subscriptions', (status) => {
    const { result } = renderAccess(createState(status));

    expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
  });

  it('treats a past-due subscription as eligible', () => {
    const { result } = renderAccess(createState(SUBSCRIPTION_STATUSES.pastDue));

    expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
  });

  it('treats a user without an active subscription as eligible', () => {
    const { result } = renderAccess(createState());

    expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
  });
});
