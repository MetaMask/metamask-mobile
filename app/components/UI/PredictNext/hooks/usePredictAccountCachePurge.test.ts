import { QueryObserver } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { usePredictAccountCachePurge } from './usePredictAccountCachePurge';
import ReactQueryService from '../../../../core/ReactQueryService';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockControllerMessenger = {
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};
let mockCurrentControllerMessenger = mockControllerMessenger;

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    // Read at render time, like the real Engine singleton: a recreated
    // Engine exposes a different messenger.
    get controllerMessenger() {
      return mockCurrentControllerMessenger;
    },
  },
}));

jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: new (jest.requireActual(
      '@tanstack/react-query',
    ).QueryClient)(),
  },
}));

const ACCOUNT_DATA_CLEARED = 'PredictPortfolioService:accountDataCleared';
const queryClient = ReactQueryService.queryClient;

/** The listener the hook registered on the Engine messenger. */
const registeredListener = (): (() => void) => {
  const call = mockSubscribe.mock.calls.find(
    ([event]) => event === ACCOUNT_DATA_CLEARED,
  );
  if (!call) {
    throw new Error('The purge listener was not registered');
  }
  return call[1] as () => void;
};

/** Lets every pending promise chain settle. */
const settle = async (): Promise<void> => {
  for (let tick = 0; tick < 20; tick += 1) {
    await Promise.resolve();
  }
};

const seedAccountReads = () => {
  queryClient.setQueryData(['PredictPortfolioService:getBalance', 'kalshi'], {
    venueId: 'kalshi',
    currency: 'USD',
    available: '100.00',
  });
  queryClient.setQueryData(
    ['PredictPortfolioService:getPositions', 'kalshi', { limit: 20 }],
    { venueId: 'kalshi', positions: [] },
  );
  queryClient.setQueryData(
    ['PredictPortfolioService:getActivity', 'kalshi', { limit: 20 }],
    { venueId: 'kalshi', activity: [] },
  );
};

describe('usePredictAccountCachePurge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentControllerMessenger = mockControllerMessenger;
    queryClient.clear();
  });

  afterEach(() => {
    // Drops the queries and their garbage-collection timers, which would
    // otherwise outlive the test run.
    queryClient.clear();
  });

  it('subscribes to account-data-cleared and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => usePredictAccountCachePurge());

    expect(mockSubscribe).toHaveBeenCalledWith(
      ACCOUNT_DATA_CLEARED,
      expect.any(Function),
    );

    const listener = registeredListener();
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      ACCOUNT_DATA_CLEARED,
      listener,
    );
  });

  it('resubscribes when the Engine is recreated with a new messenger', () => {
    const { rerender } = renderHook(() => usePredictAccountCachePurge());
    const previousListener = registeredListener();
    const nextMessenger = { subscribe: jest.fn(), unsubscribe: jest.fn() };

    mockCurrentControllerMessenger = nextMessenger;
    rerender({});

    // The destroyed Engine's messenger is released; the live one is bound.
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      ACCOUNT_DATA_CLEARED,
      previousListener,
    );
    expect(nextMessenger.subscribe).toHaveBeenCalledWith(
      ACCOUNT_DATA_CLEARED,
      expect.any(Function),
    );
  });

  it('removes only PredictNext portfolio queries', () => {
    seedAccountReads();
    queryClient.setQueryData(['PredictMarketDataService:getFeed', 'kalshi'], {
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: [],
    });
    queryClient.setQueryData(['AccountsController:getState'], { accounts: {} });
    renderHook(() => usePredictAccountCachePurge());

    act(() => {
      registeredListener()();
    });

    expect(
      queryClient.getQueryData([
        'PredictPortfolioService:getBalance',
        'kalshi',
      ]),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData([
        'PredictPortfolioService:getPositions',
        'kalshi',
        { limit: 20 },
      ]),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData([
        'PredictPortfolioService:getActivity',
        'kalshi',
        { limit: 20 },
      ]),
    ).toBeUndefined();
    // Public market-data reads and every other domain keep their cache.
    expect(
      queryClient.getQueryData(['PredictMarketDataService:getFeed', 'kalshi']),
    ).toBeDefined();
    expect(
      queryClient.getQueryData(['AccountsController:getState']),
    ).toBeDefined();
  });

  it('removes portfolio reads for every Venue, because they are account-scoped', () => {
    queryClient.setQueryData(['PredictPortfolioService:getBalance', 'other'], {
      venueId: 'other',
      currency: 'USD',
      available: '1.00',
    });
    renderHook(() => usePredictAccountCachePurge());

    act(() => {
      registeredListener()();
    });

    expect(
      queryClient.getQueryData(['PredictPortfolioService:getBalance', 'other']),
    ).toBeUndefined();
  });

  it('clears a mounted observer of the previous Predict User and refetches it', async () => {
    interface Balance {
      venueId: string;
      currency: string;
      available: string;
    }
    const queryKey = ['PredictPortfolioService:getBalance', 'kalshi'];
    const pending: ((value: Balance) => void)[] = [];
    const queryFn = jest.fn(
      () => new Promise<Balance>((resolve) => pending.push(resolve)),
    );
    const observer = new QueryObserver<Balance>(queryClient, {
      queryKey,
      queryFn,
    });
    const unsubscribe = observer.subscribe(() => undefined);

    // A mounted Portfolio screen showing the previous Predict User's Balance.
    pending[0]?.({ venueId: 'kalshi', currency: 'USD', available: '100.00' });
    await settle();
    expect(observer.getCurrentResult().data).toMatchObject({
      available: '100.00',
    });

    queryClient.setQueryData(['PredictMarketDataService:getFeed', 'kalshi'], {
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: [],
    });
    renderHook(() => usePredictAccountCachePurge());

    act(() => {
      registeredListener()();
    });
    await settle();

    // The mounted observer no longer holds the previous person's Balance, and
    // it refetched through the service action instead of rebuilding lazily.
    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(queryFn).toHaveBeenCalledTimes(2);
    // The still-mounted query is reset, not removed.
    expect(queryClient.getQueryCache().find({ queryKey })).toBeDefined();

    pending[1]?.({ venueId: 'kalshi', currency: 'USD', available: '4.00' });
    await settle();

    expect(observer.getCurrentResult().data).toMatchObject({
      available: '4.00',
    });
    expect(queryClient.getQueryData(queryKey)).toMatchObject({
      available: '4.00',
    });
    // Public market-data reads are still untouched.
    expect(
      queryClient.getQueryData(['PredictMarketDataService:getFeed', 'kalshi']),
    ).toBeDefined();

    unsubscribe();
  });
});
