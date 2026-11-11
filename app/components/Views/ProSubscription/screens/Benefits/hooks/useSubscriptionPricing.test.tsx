import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import {
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  type PricingResponse,
} from '@metamask/subscription-controller';
import Logger from '../../../../../../util/Logger';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import { PLUS_PRICING_STATUS } from '../utils/mapMoneyAccountPlusPricing';
import {
  SUBSCRIPTION_PRICING_QUERY_KEY,
  useSubscriptionPricing,
} from './useSubscriptionPricing';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockRefetch = jest.fn();
const mockedLoggerError = jest.mocked(Logger.error);

const plusPricingResponse: PricingResponse = {
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      prices: [
        {
          interval: RECURRING_INTERVALS.month,
          unitAmount: 499,
          unitDecimals: 2,
          currency: 'usd',
          trialPeriodDays: 0,
          minBillingCycles: 1,
          minBillingCyclesForBalance: 1,
        },
      ],
    },
  ],
  paymentMethods: [],
};

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery<PricingResponse>>> = {},
): ReturnType<typeof useQuery<PricingResponse>> =>
  ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  }) as ReturnType<typeof useQuery<PricingResponse>>;

const setUnlocked = (isUnlocked: boolean) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsUnlocked) {
      return isUnlocked;
    }

    return undefined;
  });
};

describe('useSubscriptionPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue(makeQueryResult());
    setUnlocked(true);
  });

  it('fetches pricing when the wallet is unlocked', () => {
    renderHook(() => useSubscriptionPricing());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: SUBSCRIPTION_PRICING_QUERY_KEY,
      enabled: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
  });

  it('pauses the pricing query when the wallet is locked', () => {
    setUnlocked(false);

    renderHook(() => useSubscriptionPricing());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: SUBSCRIPTION_PRICING_QUERY_KEY,
        enabled: false,
      }),
    );
  });

  it('reports loading while the first fetch is in progress', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('clears loading after the fetch settles', () => {
    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('reports loading while a refetch has no displayable pricing', () => {
    mockUseQuery.mockReturnValue(
      makeQueryResult({
        isLoading: false,
        isFetching: true,
        error: new Error('network down'),
      }),
    );

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('keeps loading false during a refetch when pricing is already ready', () => {
    mockUseQuery.mockReturnValue(
      makeQueryResult({
        data: plusPricingResponse,
        isLoading: false,
        isFetching: true,
      }),
    );

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.plusPricing.status).toBe(PLUS_PRICING_STATUS.ready);
  });

  it('sets hasError and logs when the query fails', () => {
    const fetchError = new Error('network down');
    mockUseQuery.mockReturnValue(makeQueryResult({ error: fetchError }));

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      fetchError,
      expect.objectContaining({
        tags: { feature: 'pro-subscription' },
        context: {
          name: 'subscription_pricing',
          data: { method: 'getPricing' },
        },
      }),
    );
  });

  it('wraps a non-Error query failure before logging', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ error: 'boom' as never }));

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.hasError).toBe(true);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.any(Object),
    );
  });

  it('retries the pricing query', async () => {
    const { result } = renderHook(() => useSubscriptionPricing());

    await act(async () => {
      result.current.retry();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected refetch', async () => {
    mockRefetch.mockRejectedValue(new Error('still down'));

    const { result } = renderHook(() => useSubscriptionPricing());

    await act(async () => {
      result.current.retry();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('returns mapped Plus pricing from query data', () => {
    mockUseQuery.mockReturnValue(
      makeQueryResult({ data: plusPricingResponse }),
    );

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.plusPricing.status).toBe(PLUS_PRICING_STATUS.ready);
    expect(result.current.plusPricing.monthly?.amount).toBe(4.99);
  });
});
