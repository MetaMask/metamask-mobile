import { renderHook } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import type { RootState } from '../../../../../../reducers';
import configureStore from '../../../../../../util/test/configureStore';
import { useSubscriptionPricing } from './useSubscriptionPricing';
import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  type PricingResponse,
} from '@metamask/subscription-controller';

const createStoreState = (pricing?: PricingResponse) =>
  ({
    engine: {
      backgroundState: {
        SubscriptionController: {
          subscriptions: [],
          trialedProducts: [],
          pricing,
        },
      },
    },
  }) as unknown as RootState;

const renderUseSubscriptionPricing = (pricing?: PricingResponse) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={configureStore(createStoreState(pricing))}>
      {children}
    </Provider>
  );

  return renderHook(() => useSubscriptionPricing(), { wrapper: Wrapper });
};

describe('useSubscriptionPricing', () => {
  it('returns unavailable when pricing has not been persisted', () => {
    const { result } = renderUseSubscriptionPricing();

    expect(result.current.plusPricing).toEqual({ status: 'unavailable' });
  });

  it('returns mapped Plus pricing from SubscriptionController state', () => {
    const pricing = {
      products: [
        {
          name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
          prices: [
            {
              interval: RECURRING_INTERVALS.month,
              unitAmount: 499,
              unitDecimals: 2,
              currency: 'usd' as const,
              trialPeriodDays: 0,
              minBillingCycles: 1,
              minBillingCyclesForBalance: 1,
            },
          ],
        },
      ],
      paymentMethods: [],
    };

    const { result } = renderUseSubscriptionPricing(pricing);

    expect(result.current.plusPricing.status).toBe('ready');
    expect(result.current.plusPricing.monthly?.amount).toBe(4.99);
  });
});
