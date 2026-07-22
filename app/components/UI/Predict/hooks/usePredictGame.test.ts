import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { predictGameKeys } from '../queries/game';
import {
  Recurrence,
  type GameUpdate,
  type PredictMarket,
  type PredictMarketGame,
  type PredictSportTeam,
} from '../types';
import {
  __resetPredictGameCacheForTest,
  usePredictGame,
} from './usePredictGame';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToGameUpdates: jest.fn(),
      subscribeToConnectionStatus: jest.fn(),
      getConnectionStatus: jest.fn(),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
};

const createTeam = (
  abbreviation: string,
  overrides: Partial<PredictSportTeam> = {},
): PredictSportTeam => ({
  id: abbreviation.toLowerCase(),
  name: `Team ${abbreviation}`,
  logo: `https://example.com/${abbreviation}.png`,
  abbreviation,
  color: 'team-color',
  ...overrides,
});

const createGame = (
  overrides: Partial<PredictMarketGame> = {},
): PredictMarketGame => ({
  id: 'game-123',
  startTime: '2026-01-01T18:00:00.000Z',
  status: 'scheduled',
  league: 'nfl',
  elapsed: null,
  period: null,
  score: { away: 0, home: 0, raw: '0-0' },
  awayTeam: createTeam('AWY'),
  homeTeam: createTeam('HME'),
  ...overrides,
});

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-123',
  providerId: 'polymarket',
  slug: 'away-vs-home',
  title: 'Away vs Home',
  description: 'Game winner',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['sports'],
  outcomes: [],
  liquidity: 100,
  volume: 100,
  game: createGame(),
  ...overrides,
});

const createUpdate = (overrides: Partial<GameUpdate> = {}): GameUpdate => ({
  gameId: 'game-123',
  score: '21-14',
  elapsed: '12:34',
  period: 'Q2',
  status: 'ongoing',
  ...overrides,
});

describe('usePredictGame', () => {
  const mockSubscribeToGameUpdates = Engine.context.PredictController
    .subscribeToGameUpdates as jest.Mock;
  const mockSubscribeToConnectionStatus = Engine.context.PredictController
    .subscribeToConnectionStatus as jest.Mock;
  const mockGetConnectionStatus = Engine.context.PredictController
    .getConnectionStatus as jest.Mock;
  const mockUnsubscribe = jest.fn();
  const mockUnsubscribeStatus = jest.fn();
  let statusCallbacks: ((status: {
    sportsConnected: boolean;
    marketConnected: boolean;
  }) => void)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __resetPredictGameCacheForTest();
    statusCallbacks = [];

    mockSubscribeToGameUpdates.mockReturnValue(mockUnsubscribe);
    mockGetConnectionStatus.mockReturnValue({
      sportsConnected: true,
      marketConnected: false,
    });
    mockSubscribeToConnectionStatus.mockImplementation((callback) => {
      statusCallbacks.push(callback);
      callback(mockGetConnectionStatus());
      return mockUnsubscribeStatus;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns the provided REST game before live updates arrive', () => {
    const { Wrapper, queryClient } = createWrapper();
    const market = createMarket();
    const game = market.game as PredictMarketGame;

    const { result } = renderHook(() => usePredictGame(market), {
      wrapper: Wrapper,
    });

    expect(result.current.game).toEqual(game);
    expect(queryClient.getQueryData(predictGameKeys.detail(game.id))).toEqual(
      game,
    );
    expect(mockSubscribeToGameUpdates).not.toHaveBeenCalled();
  });

  it('returns undefined when the market has no game', () => {
    const { Wrapper } = createWrapper();
    const market = createMarket({ game: undefined });

    const { result } = renderHook(() => usePredictGame(market), {
      wrapper: Wrapper,
    });

    expect(result.current.game).toBeUndefined();
    expect(mockSubscribeToGameUpdates).not.toHaveBeenCalled();
  });

  it('subscribes when live updates are requested', () => {
    const { Wrapper } = createWrapper();
    const market = createMarket();
    const game = market.game as PredictMarketGame;

    renderHook(() => usePredictGame(market, { live: true }), {
      wrapper: Wrapper,
    });

    expect(mockSubscribeToGameUpdates).toHaveBeenCalledWith(
      game.id,
      expect.any(Function),
    );
  });

  it('writes WebSocket updates into the game query cache', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const market = createMarket();
    const game = market.game as PredictMarketGame;
    let capturedCallback: (update: GameUpdate) => void = jest.fn();
    mockSubscribeToGameUpdates.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(
      () => usePredictGame(market, { live: true }),
      {
        wrapper: Wrapper,
      },
    );

    act(() => {
      capturedCallback(createUpdate());
    });

    await waitFor(() => {
      expect(result.current.game).toEqual(
        expect.objectContaining({
          status: 'ongoing',
          elapsed: '12:34',
          period: 'Q2',
          score: { away: 21, home: 14, raw: '21-14' },
        }),
      );
    });

    expect(queryClient.getQueryData(predictGameKeys.detail(game.id))).toEqual(
      expect.objectContaining({
        status: 'ongoing',
        elapsed: '12:34',
        period: 'Q2',
        score: { away: 21, home: 14, raw: '21-14' },
      }),
    );
  });

  it('reads the cached live game immediately after remounting', async () => {
    const { Wrapper } = createWrapper();
    const market = createMarket();
    let capturedCallback: (update: GameUpdate) => void = jest.fn();
    mockSubscribeToGameUpdates.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return mockUnsubscribe;
    });

    const firstHook = renderHook(() => usePredictGame(market, { live: true }), {
      wrapper: Wrapper,
    });

    act(() => {
      capturedCallback(createUpdate({ score: '28-21', elapsed: '05:00' }));
    });

    await waitFor(() => {
      expect(firstHook.result.current.game?.score).toEqual({
        away: 28,
        home: 21,
        raw: '28-21',
      });
    });

    firstHook.unmount();

    const secondHook = renderHook(
      () => usePredictGame(createMarket(), { live: true }),
      {
        wrapper: Wrapper,
      },
    );

    expect(secondHook.result.current.game).toEqual(
      expect.objectContaining({
        status: 'ongoing',
        elapsed: '05:00',
        score: { away: 28, home: 21, raw: '28-21' },
      }),
    );
  });

  it('does not overwrite fresher live fields with a stale REST prop', async () => {
    const { Wrapper } = createWrapper();
    let capturedCallback: (update: GameUpdate) => void = jest.fn();
    mockSubscribeToGameUpdates.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return mockUnsubscribe;
    });

    const { result, rerender } = renderHook(
      ({ market }) => usePredictGame(market, { live: true }),
      {
        initialProps: { market: createMarket() },
        wrapper: Wrapper,
      },
    );

    act(() => {
      capturedCallback(createUpdate({ score: '21-14', elapsed: '06:30' }));
    });

    await waitFor(() => {
      expect(result.current.game?.elapsed).toBe('06:30');
    });

    rerender({
      market: createMarket({
        game: createGame({
          status: 'scheduled',
          elapsed: null,
          period: null,
          score: { away: 0, home: 0, raw: '0-0' },
        }),
      }),
    });

    expect(result.current.game).toEqual(
      expect.objectContaining({
        status: 'ongoing',
        elapsed: '06:30',
        period: 'Q2',
        score: { away: 21, home: 14, raw: '21-14' },
      }),
    );
  });

  it('allows terminal REST state to replace an older ongoing cache entry', async () => {
    const { Wrapper } = createWrapper();
    let capturedCallback: (update: GameUpdate) => void = jest.fn();
    mockSubscribeToGameUpdates.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return mockUnsubscribe;
    });

    const { result, rerender } = renderHook(
      ({ market }) => usePredictGame(market, { live: true }),
      {
        initialProps: {
          market: createMarket({ game: createGame({ status: 'ongoing' }) }),
        },
        wrapper: Wrapper,
      },
    );

    act(() => {
      capturedCallback(createUpdate({ score: '21-14', elapsed: '01:00' }));
    });

    await waitFor(() => {
      expect(result.current.game?.status).toBe('ongoing');
    });

    rerender({
      market: createMarket({
        game: createGame({
          status: 'ended',
          period: 'FT',
          elapsed: null,
          endTime: '2026-01-01T21:00:00.000Z',
          score: { away: 24, home: 21, raw: '24-21' },
        }),
      }),
    });

    await waitFor(() => {
      expect(result.current.game).toEqual(
        expect.objectContaining({
          status: 'ended',
          period: 'FT',
          elapsed: null,
          endTime: '2026-01-01T21:00:00.000Z',
          score: { away: 24, home: 21, raw: '24-21' },
        }),
      );
    });
  });

  it('updates connection status when the subscription pushes a transition', () => {
    const { Wrapper } = createWrapper();
    mockGetConnectionStatus.mockReturnValue({
      sportsConnected: true,
      marketConnected: false,
    });

    const { result } = renderHook(
      () => usePredictGame(createMarket(), { live: true }),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.isConnected).toBe(true);

    act(() => {
      statusCallbacks.forEach((cb) =>
        cb({ sportsConnected: false, marketConnected: false }),
      );
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('does not create a polling timer for connection status', () => {
    const { Wrapper } = createWrapper();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    renderHook(() => usePredictGame(createMarket(), { live: true }), {
      wrapper: Wrapper,
    });

    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });

  it('unsubscribes from game updates and connection status on unmount', () => {
    const { Wrapper } = createWrapper();

    const { unmount } = renderHook(
      () => usePredictGame(createMarket(), { live: true }),
      {
        wrapper: Wrapper,
      },
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockUnsubscribeStatus).toHaveBeenCalled();
  });
});
