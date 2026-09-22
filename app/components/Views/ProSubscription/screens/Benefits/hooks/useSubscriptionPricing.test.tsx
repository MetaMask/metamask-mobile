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
import {
  SUBSCRIPTION_PRICING_QUERY_KEY,
  useSubscriptionPricing,
} from './useSubscriptionPricing';
import { PLUS_PRICING_STATUS } from '../utils/mapMoneyAccountPlusPricing';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

jest.mock('@metamask/react-data-query');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockedLoggerError = Logger.error as jest.Mock;

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery>> = {},
): ReturnType<typeof useQuery> =>
  ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  }) as ReturnType<typeof useQuery>;

const mockPricing: PricingResponse = {
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

describe('useSubscriptionPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return true;
      }
      return undefined;
    });
  });

  it('calls useQuery with the SubscriptionService:getPricing key', () => {
    renderHook(() => useSubscriptionPricing());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: SUBSCRIPTION_PRICING_QUERY_KEY,
        enabled: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }),
    );
  });

  it('disables the query when the wallet is locked', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsUnlocked) {
        return false;
      }
      return undefined;
    });

    renderHook(() => useSubscriptionPricing());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: SUBSCRIPTION_PRICING_QUERY_KEY,
        enabled: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }),
    );
  });

  it('maps Plus pricing from query data', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ data: mockPricing }));

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.plusPricing.status).toBe(PLUS_PRICING_STATUS.ready);
    expect(result.current.plusPricing.monthly?.amount).toBe(4.99);
    expect(result.current.hasError).toBe(false);
  });

  it('returns unavailable pricing when query data is undefined', () => {
    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.plusPricing.status).toBe(
      PLUS_PRICING_STATUS.unavailable,
    );
  });

  it('exposes isLoading from useQuery', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.isLoading).toBe(true);
  });

  it('sets hasError and logs when useQuery returns an Error', () => {
    const fetchError = new Error('network down');
    mockUseQuery.mockReturnValue(makeQueryResult({ error: fetchError }));

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      fetchError,
      expect.objectContaining({
        tags: { feature: 'pro-subscription' },
      }),
    );
  });

  it('wraps a non-Error query failure before logging', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ error: 'boom' }));

    const { result } = renderHook(() => useSubscriptionPricing());

    expect(result.current.hasError).toBe(true);
    expect(mockedLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boom' }),
      expect.any(Object),
    );
  });

  it('does not log when there is no query error', () => {
    mockUseQuery.mockReturnValue(makeQueryResult({ data: mockPricing }));

    renderHook(() => useSubscriptionPricing());

    expect(mockedLoggerError).not.toHaveBeenCalled();
  });

  it('delegates retry to query refetch', async () => {
    const queryRefetch = jest.fn().mockResolvedValue(undefined);
    mockUseQuery.mockReturnValue(makeQueryResult({ refetch: queryRefetch }));

    const { result } = renderHook(() => useSubscriptionPricing());

    await act(async () => {
      result.current.retry();
    });

    expect(queryRefetch).toHaveBeenCalledTimes(1);
  });
});
