import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import type { RootState } from '../../../../../../reducers';
import configureStore from '../../../../../../util/test/configureStore';
import { useSubscriptionPricing } from './useSubscriptionPricing';
import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  type PricingResponse,
} from '@metamask/subscription-controller';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionController: {
        getPricing: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockedGetPricing = Engine.context.SubscriptionController
  .getPricing as jest.Mock;
const mockedLoggerError = Logger.error as jest.Mock;

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPricing.mockResolvedValue(undefined);
  });

  it('calls getPricing on mount', async () => {
    renderUseSubscriptionPricing();

    await waitFor(() => {
      expect(mockedGetPricing).toHaveBeenCalledTimes(1);
    });
  });

  it('starts in a loading state before getPricing resolves', () => {
    mockedGetPricing.mockReturnValue(new Promise(() => undefined));

    const { result } = renderUseSubscriptionPricing();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('clears loading after getPricing resolves', async () => {
    const { result } = renderUseSubscriptionPricing();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasError).toBe(false);
  });

  it('sets hasError when getPricing rejects', async () => {
    const fetchError = new Error('network down');
    mockedGetPricing.mockRejectedValue(fetchError);

    const { result } = renderUseSubscriptionPricing();

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      fetchError,
      expect.objectContaining({
        tags: { feature: 'pro-subscription' },
      }),
    );
  });

  it('wraps a non-Error rejection before logging', async () => {
    mockedGetPricing.mockRejectedValue('boom');

    const { result } = renderUseSubscriptionPricing();

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    expect(mockedLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.any(Object),
    );
  });

  it('does not start a second getPricing call while one is in flight', async () => {
    let resolvePricing: () => void = () => undefined;
    mockedGetPricing.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePricing = resolve;
      }),
    );

    const { result } = renderUseSubscriptionPricing();

    await waitFor(() => {
      expect(mockedGetPricing).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      result.current.retry();
    });

    expect(mockedGetPricing).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePricing();
    });
  });

  it('retries getPricing after a failed fetch', async () => {
    mockedGetPricing
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderUseSubscriptionPricing();

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.hasError).toBe(false);
    });

    expect(mockedGetPricing).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns mapped Plus pricing from SubscriptionController state', () => {
    mockedGetPricing.mockReturnValue(new Promise(() => undefined));
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
