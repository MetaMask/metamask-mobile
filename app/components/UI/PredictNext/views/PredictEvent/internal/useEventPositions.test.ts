import { renderHook } from '@testing-library/react-native';
import {
  makePredictNextCompositeGameEvent,
  makePredictNextMultiMarketEvent,
  makePredictNextPosition,
} from '../../../../../../../tests/component-view/fixtures/predictNext';
import type { usePositions } from '../../../hooks/usePositions';
import { PORTFOLIO_PAGE_LIMIT } from '../../../queries/portfolioQueries';
import type {
  PredictEvent,
  PredictPosition,
  PredictVenueId,
} from '../../../types';
import { useEventPositions } from './useEventPositions';

// Keep async discovery journeys in EventMarketList.view.test.tsx. These narrow
// contracts inspect canonical objects and reference stability, not rendered UI.
type PositionsQuery = Pick<
  ReturnType<typeof usePositions>,
  'data' | 'isError' | 'isFetching' | 'hasNextPage' | 'fetchNextPage'
>;

const mockUsePositions = jest.fn<
  PositionsQuery,
  Parameters<typeof usePositions>
>();

jest.mock('../../../hooks/usePositions', () => ({
  usePositions: (...args: Parameters<typeof usePositions>) =>
    mockUsePositions(...args),
}));

jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

const makePositionsQuery = (
  event: PredictEvent,
  positionsByPage: PredictPosition[][],
): PositionsQuery => ({
  data: {
    pages: positionsByPage.map((positions) => ({
      venueId: event.venueId,
      positions,
    })),
    pageParams: positionsByPage.map((_, index) =>
      index === 0 ? undefined : `page-${index + 1}`,
    ),
  },
  isError: false,
  isFetching: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
});

const renderEventPositions = (event: PredictEvent) =>
  renderHook(
    ({ event: currentEvent }: { event: PredictEvent }) =>
      useEventPositions(currentEvent),
    { initialProps: { event } },
  );

describe('useEventPositions', () => {
  beforeEach(() => {
    mockUsePositions.mockReset();
  });

  it('returns the canonical holdings for every Event Market regardless of display context', () => {
    const event = makePredictNextCompositeGameEvent();
    const holdings = event.markets.map((market, index) =>
      makePredictNextPosition({
        marketId: market.id,
        ...(index === 0 ? { context: undefined } : {}),
      }),
    );
    const unrelated = makePredictNextPosition({
      context: {
        eventId: event.id,
        eventTitle: event.title,
        marketQuestion: 'A Market outside this Event',
      },
    });
    const otherVenue = makePredictNextPosition({
      venueId: 'other-venue',
      marketId: event.markets[0].id,
    });
    mockUsePositions.mockReturnValue(
      makePositionsQuery(event, [
        [unrelated, ...holdings.slice(0, 3)],
        [otherVenue, ...holdings.slice(3)],
      ]),
    );

    const { result } = renderEventPositions(event);

    expect(result.current).toEqual(holdings);
    holdings.forEach((position, index) => {
      expect(result.current[index]).toBe(position);
    });
  });

  it('keeps both Outcome sides and the latest object for duplicates within and across pages', () => {
    const event = makePredictNextMultiMarketEvent();
    const yes = makePredictNextPosition({
      marketId: event.markets[0].id,
      shares: '12.50',
    });
    const no = makePredictNextPosition({ ...yes, side: 'no', shares: '8.00' });
    const duplicateYes = makePredictNextPosition({
      ...yes,
      shares: '99.00',
      context: undefined,
    });
    const duplicateNo = makePredictNextPosition({ ...no, shares: '100.00' });
    mockUsePositions.mockReturnValue(
      makePositionsQuery(event, [
        [no, yes, duplicateYes],
        [duplicateYes, duplicateNo],
      ]),
    );

    const { result } = renderEventPositions(event);

    expect(result.current).toEqual([duplicateYes, duplicateNo]);
    expect(result.current[0]).toBe(duplicateYes);
    expect(result.current[1]).toBe(duplicateNo);
  });

  it('omits a holding once a later copy is no longer open', () => {
    const event = makePredictNextMultiMarketEvent();
    const open = makePredictNextPosition({
      marketId: event.markets[0].id,
      shares: '12.50',
    });
    const settled = makePredictNextPosition({
      ...open,
      status: 'settled',
      shares: '12.50',
    });
    const claimable = makePredictNextPosition({
      marketId: event.markets[1].id,
      status: 'claimable',
    });
    mockUsePositions.mockReturnValue(
      makePositionsQuery(event, [[open, claimable], [settled]]),
    );

    const { result } = renderEventPositions(event);

    expect(result.current).toEqual([]);
  });

  it('reprojects the same cached holdings when Event Market membership changes', () => {
    const event = makePredictNextMultiMarketEvent();
    const first = makePredictNextPosition({ marketId: event.markets[0].id });
    const second = makePredictNextPosition({ marketId: event.markets[1].id });
    mockUsePositions.mockReturnValue(
      makePositionsQuery(event, [[first, second]]),
    );
    const { result, rerender } = renderEventPositions({
      ...event,
      markets: [event.markets[0]],
    });
    expect(result.current).toEqual([first]);

    rerender({ event });

    expect(result.current).toEqual([first, second]);

    rerender({ event: { ...event, markets: [event.markets[1]] } });

    expect(result.current).toEqual([second]);
  });

  it('switches the query and holdings to the new Venue when Market IDs collide', () => {
    const event = makePredictNextMultiMarketEvent();
    const otherVenueId = 'other-venue' as PredictVenueId;
    const first = makePredictNextPosition({ marketId: event.markets[0].id });
    const otherVenue = makePredictNextPosition({
      ...first,
      venueId: otherVenueId,
      shares: '9.00',
    });
    mockUsePositions.mockReturnValue(
      makePositionsQuery(event, [[first, otherVenue]]),
    );
    const { result, rerender } = renderEventPositions(event);
    expect(result.current).toEqual([first]);

    rerender({ event: { ...event, venueId: otherVenueId } });

    expect(result.current).toEqual([otherVenue]);
    expect(mockUsePositions).toHaveBeenLastCalledWith(
      otherVenueId,
      { limit: PORTFOLIO_PAGE_LIMIT },
      { enabled: true },
    );
  });

  it('replaces changed holdings with refreshed canonical objects and drops removed holdings', () => {
    const event = makePredictNextMultiMarketEvent();
    const first = makePredictNextPosition({ marketId: event.markets[0].id });
    const removed = makePredictNextPosition({ marketId: event.markets[1].id });
    const refreshed = makePredictNextPosition({ ...first, shares: '5.00' });
    mockUsePositions.mockReturnValue(
      makePositionsQuery(event, [[first, removed]]),
    );
    const { result, rerender } = renderEventPositions(event);
    expect(result.current).toEqual([first, removed]);

    mockUsePositions.mockReturnValue(makePositionsQuery(event, [[refreshed]]));
    rerender({ event });

    expect(result.current).toEqual([refreshed]);
    expect(result.current[0]).toBe(refreshed);
  });

  it('clears prior holdings when refreshed cache pages are empty', () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    mockUsePositions.mockReturnValue(makePositionsQuery(event, [[position]]));
    const { result, rerender } = renderEventPositions(event);
    expect(result.current).toEqual([position]);

    mockUsePositions.mockReturnValue(makePositionsQuery(event, [[]]));
    rerender({ event });

    expect(result.current).toEqual([]);
  });

  it('clears prior holdings when cached data becomes unavailable', () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const query = makePositionsQuery(event, [[position]]);
    mockUsePositions.mockReturnValue(query);
    const { result, rerender } = renderEventPositions(event);
    expect(result.current).toEqual([position]);

    mockUsePositions.mockReturnValue({ ...query, data: undefined });
    rerender({ event });

    expect(result.current).toEqual([]);
  });

  it('preserves the holdings reference when query wrappers and unrelated Event metadata change', () => {
    const event = makePredictNextMultiMarketEvent();
    const position = makePredictNextPosition({ marketId: event.markets[0].id });
    const query = makePositionsQuery(event, [[position]]);
    mockUsePositions.mockImplementation(() => ({ ...query }));
    const { result, rerender } = renderEventPositions(event);
    const holdings = result.current;
    expect(holdings).toEqual([position]);

    rerender({ event: { ...event, title: 'Updated Event title' } });

    expect(result.current).toBe(holdings);
  });
});
