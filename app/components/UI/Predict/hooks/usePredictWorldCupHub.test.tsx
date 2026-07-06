import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../constants/flags';
import type { PredictMarket } from '../types';
import {
  usePredictWorldCupGamesSections,
  usePredictWorldCupWinnerMarket,
} from './usePredictWorldCupHub';

const mockGetMarkets = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictController: {
        getMarkets: (...args: unknown[]) => mockGetMarkets(...args),
      },
    },
  },
}));

jest.mock('../utils/feed', () => ({
  filterStandaloneMarkets: (markets: PredictMarket[]) => markets,
}));

jest.mock('../utils/marketStaleness', () => ({
  getVisiblePredictMarkets: (markets: PredictMarket[]) => markets,
}));

const createMarket = (overrides: Partial<PredictMarket> = {}): PredictMarket =>
  ({
    id: 'market-1',
    title: 'Test Market',
    outcomes: [],
    parentMarketId: null,
    ...overrides,
  }) as PredictMarket;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

describe('usePredictWorldCupGamesSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMarkets.mockResolvedValue({ markets: [], nextCursor: null });
  });

  it('returns empty sections when no stages are configured', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePredictWorldCupGamesSections({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          stages: [],
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.sections).toHaveLength(0);
  });

  it('returns a section for each stage that has markets', async () => {
    const { Wrapper } = createWrapper();
    const market = createMarket({ id: 'round32-market' });
    mockGetMarkets.mockResolvedValue({ markets: [market], nextCursor: null });

    const { result } = renderHook(
      () =>
        usePredictWorldCupGamesSections({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          stages: [{ key: 'round_of_32', eventIds: ['evt-1'] }],
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.sections).toHaveLength(1));

    expect(result.current.sections[0].key).toBe('round_of_32');
    expect(result.current.sections[0].markets).toHaveLength(1);
  });

  it('omits sections whose stages return no markets', async () => {
    const { Wrapper } = createWrapper();
    mockGetMarkets.mockResolvedValue({ markets: [], nextCursor: null });

    const { result } = renderHook(
      () =>
        usePredictWorldCupGamesSections({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          stages: [{ key: 'final', eventIds: ['evt-final'] }],
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.sections).toHaveLength(0);
  });

  it('preserves canonical stage order from config', async () => {
    const { Wrapper } = createWrapper();
    const qfMarket = createMarket({ id: 'qf-market' });
    const sfMarket = createMarket({ id: 'sf-market' });

    mockGetMarkets.mockImplementation(
      ({ customQueryParams }: { customQueryParams: string }) => {
        if (customQueryParams.includes('evt-qf')) {
          return Promise.resolve({ markets: [qfMarket], nextCursor: null });
        }
        return Promise.resolve({ markets: [sfMarket], nextCursor: null });
      },
    );

    const { result } = renderHook(
      () =>
        usePredictWorldCupGamesSections({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          stages: [
            { key: 'quarterfinals', eventIds: ['evt-qf'] },
            { key: 'semifinals', eventIds: ['evt-sf'] },
          ],
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.sections).toHaveLength(2));

    expect(result.current.sections[0].key).toBe('quarterfinals');
    expect(result.current.sections[1].key).toBe('semifinals');
  });

  it('exposes live status from availability', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePredictWorldCupGamesSections({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          stages: [],
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.isLive).toBe(false);
  });

  it('returns null error by default', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePredictWorldCupGamesSections({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          stages: [],
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.error).toBeNull();
  });

  it('exposes an error message when a stage query fails', async () => {
    const { Wrapper } = createWrapper();
    mockGetMarkets.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(
      () =>
        usePredictWorldCupGamesSections({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          stages: [{ key: 'final', eventIds: ['evt-final'] }],
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.error).toBe('network down'));
  });

  it('does not run queries when disabled', () => {
    const { Wrapper } = createWrapper();

    renderHook(
      () =>
        usePredictWorldCupGamesSections(
          {
            ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
            stages: [{ key: 'final', eventIds: ['evt-final'] }],
          },
          { enabled: false },
        ),
      { wrapper: Wrapper },
    );

    expect(mockGetMarkets).not.toHaveBeenCalled();
  });
});

describe('usePredictWorldCupWinnerMarket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMarkets.mockResolvedValue({ markets: [], nextCursor: null });
  });

  it('returns null market immediately when winnerEventId is empty', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePredictWorldCupWinnerMarket({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          winnerEventId: '',
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.market).toBeNull();
  });

  it('returns the first market when winnerEventId is configured', async () => {
    const { Wrapper } = createWrapper();
    const winnerMarket = createMarket({
      id: 'winner-market',
      title: 'World Cup Winner',
    });
    mockGetMarkets.mockResolvedValue({
      markets: [winnerMarket],
      nextCursor: null,
    });

    const { result } = renderHook(
      () =>
        usePredictWorldCupWinnerMarket({
          ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
          winnerEventId: 'evt-winner',
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.market).not.toBeNull());

    expect(result.current.market?.id).toBe('winner-market');
  });
});
