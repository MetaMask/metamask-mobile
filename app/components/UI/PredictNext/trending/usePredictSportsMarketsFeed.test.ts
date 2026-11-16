import { act, renderHook, waitFor } from '@testing-library/react-native';
import { MOCK_PREDICT_MARKET } from '../../../../../tests/component-view/fixtures/predict';
import { useActiveVenue } from '../implementation/activeVenue';
import { expectInactiveHookHasNoSideEffects } from '../implementation/inactiveHook.testUtils';
import type { ActiveVenueResolution } from '../implementation/types';
import { usePredictSportsMarketsFeed } from './usePredictSportsMarketsFeed';
import { usePredictTrendingSupported } from './usePredictTrendingSupported';

const mockGetMarkets = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: (...args: unknown[]) => mockGetMarkets(...args),
    },
  },
}));

jest.mock('../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

const POLYMARKET: ActiveVenueResolution = {
  status: 'ready',
  venue: 'polymarket',
  source: 'legacyLane',
};
const KALSHI: ActiveVenueResolution = {
  status: 'ready',
  venue: 'kalshi',
  source: 'rollout',
};
const RESOLVING: ActiveVenueResolution = { status: 'resolving' };

const givenVenue = (venue: ActiveVenueResolution) =>
  jest.mocked(useActiveVenue).mockReturnValue(venue);

describe('usePredictSportsMarketsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMarkets.mockResolvedValue({
      markets: [MOCK_PREDICT_MARKET],
      nextCursor: null,
    });
  });

  it("passes the legacy lane's sport pills and markets through", async () => {
    givenVenue(POLYMARKET);

    const { result } = renderHook(() => ({
      feed: usePredictSportsMarketsFeed(),
      isSupported: usePredictTrendingSupported(),
    }));

    await waitFor(() =>
      expect(result.current.feed.active.marketData).toHaveLength(1),
    );
    expect(result.current.isSupported).toBe(true);
    expect(result.current.feed.pills.map(({ key }) => key)).toEqual([
      'soccer',
      'basketball',
      'tennis',
    ]);
    expect(result.current.feed.activeKey).toBe('soccer');
    expect(result.current.feed.active.marketData[0].id).toBe(
      MOCK_PREDICT_MARKET.id,
    );
    expect(mockGetMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'sports',
        customQueryParams: 'tag_id=100350',
      }),
    );
  });

  it('loads another sport when its pill is selected', async () => {
    givenVenue(POLYMARKET);
    const { result } = renderHook(() => usePredictSportsMarketsFeed());
    await waitFor(() => expect(mockGetMarkets).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.select('tennis');
    });

    await waitFor(() =>
      expect(mockGetMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ customQueryParams: 'tag_id=864' }),
      ),
    );
    expect(result.current.activeKey).toBe('tennis');
  });

  it('reads soccer once, without replaying an earlier refresh, when the Active Venue becomes Polymarket', async () => {
    givenVenue(KALSHI);
    const { rerender } = renderHook(
      ({ trigger }: { trigger: number }) =>
        usePredictSportsMarketsFeed({
          refresh: { trigger, silentRefresh: true },
        }),
      { initialProps: { trigger: 0 } },
    );
    rerender({ trigger: 1 });

    givenVenue(POLYMARKET);
    rerender({ trigger: 1 });

    await waitFor(() => expect(mockGetMarkets).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
  });

  describe.each([
    ['a next Venue is active', KALSHI],
    ['the Active Venue is resolving', RESOLVING],
  ])('while %s', (_, venue) => {
    it('has no sports and no markets, and is not supported', () => {
      givenVenue(venue);

      const { result } = renderHook(() => ({
        feed: usePredictSportsMarketsFeed(),
        isSupported: usePredictTrendingSupported(),
      }));

      expect(result.current.isSupported).toBe(false);
      expect(result.current.feed.pills).toEqual([]);
      expect(result.current.feed.active.marketData).toEqual([]);
      expect(result.current.feed.isLoading).toBe(false);
    });

    it('runs no legacy read, even on an Explore refresh', async () => {
      givenVenue(venue);

      await expectInactiveHookHasNoSideEffects({
        useInactiveHook: () =>
          usePredictSportsMarketsFeed({
            refresh: { trigger: 1, silentRefresh: true },
          }),
        sideEffects: [mockGetMarkets],
      });
    });
  });
});
