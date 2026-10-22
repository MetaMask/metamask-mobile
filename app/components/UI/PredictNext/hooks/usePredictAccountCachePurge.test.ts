import { act, renderHook } from '@testing-library/react-native';
import { usePredictAccountCachePurge } from './usePredictAccountCachePurge';
import ReactQueryService from '../../../../core/ReactQueryService';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    },
  },
}));

jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: new (jest.requireActual('@tanstack/react-query').QueryClient)(),
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
      queryClient.getQueryData(['PredictPortfolioService:getBalance', 'kalshi']),
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
});
