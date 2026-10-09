import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
import type { RootState } from '../../../../reducers';
import configureStore from '../../../../util/test/configureStore';
import { useIsMoneyAccountPlusTrialing } from './useIsMoneyAccountPlusTrialing';

const createState = (trialedProducts: string[] = []): RootState =>
  ({
    engine: {
      backgroundState: {
        SubscriptionController: {
          subscriptions: [],
          trialedProducts,
        },
      },
    },
  }) as unknown as RootState;

const renderTrialing = (trialedProducts?: string[]) => {
  const store = configureStore(createState(trialedProducts));
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(() => useIsMoneyAccountPlusTrialing(), {
    wrapper: Wrapper,
  });
};

describe('useIsMoneyAccountPlusTrialing', () => {
  it('returns true when Money Account Plus is a trialed product', () => {
    const { result } = renderTrialing([PRODUCT_TYPES.MONEY_ACCOUNT_PLUS]);

    expect(result.current).toBe(true);
  });

  it('returns false when only another product has been trialed', () => {
    const { result } = renderTrialing([PRODUCT_TYPES.SHIELD]);

    expect(result.current).toBe(false);
  });

  it('returns false when no products have been trialed', () => {
    const { result } = renderTrialing();

    expect(result.current).toBe(false);
  });
});
