import { renderHook } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useActiveVenue } from '../../../implementation/activeVenue';
import type { ActiveVenueResolution } from '../../../implementation/types';
import { PredictNextRoutes } from '../../../navigation/routes';
import { makeKalshiEvent } from '../../trendingHooks.testUtils';
import {
  useOpenNextTrendingEvent,
  useOrderNextTrendingOutcome,
} from './useNextTrendingActions';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../../../Predict/hooks/usePredictNavigation', () => ({
  usePredictNavigation: () => ({ navigateToMarketDetails: jest.fn() }),
}));
const mockOpenOrderFlow = jest.fn();
jest.mock('../../../views/PredictOrderFlow', () => ({
  usePredictOrderFlow: () => ({ openOrderFlow: mockOpenOrderFlow }),
}));
jest.mock('../../../implementation/activeVenue', () => ({
  useActiveVenue: jest.fn(),
}));

const KALSHI: ActiveVenueResolution = {
  status: 'ready',
  venue: 'kalshi',
  source: 'rollout',
};
const POLYMARKET: ActiveVenueResolution = {
  status: 'ready',
  venue: 'polymarket',
  source: 'legacyLane',
};
const EVENT = makeKalshiEvent('kxnfl-1', 'Packers vs Steelers');
const [MARKET] = EVENT.markets;
const [YES] = MARKET.outcomes;

describe('useOpenNextTrendingEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the Event screen of the Active Venue, after the tap callback', () => {
    jest.mocked(useActiveVenue).mockReturnValue(KALSHI);
    const beforeOpen = jest.fn(() =>
      expect(mockNavigate).not.toHaveBeenCalled(),
    );
    const { result } = renderHook(() => useOpenNextTrendingEvent('explore'));

    const opened = result.current(EVENT, beforeOpen);

    expect(opened).toBe(true);
    expect(beforeOpen).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: PredictNextRoutes.EVENT,
      params: {
        venueId: 'kalshi',
        eventId: 'kxnfl-1',
        titleSnapshot: 'Packers vs Steelers',
      },
    });
  });

  it('refuses a stale Event once the Active Venue changed, without tracking', () => {
    jest.mocked(useActiveVenue).mockReturnValue(POLYMARKET);
    const beforeOpen = jest.fn();
    const { result } = renderHook(() => useOpenNextTrendingEvent('explore'));

    const opened = result.current(EVENT, beforeOpen);

    expect(opened).toBe(false);
    expect(beforeOpen).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('useOrderNextTrendingOutcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens a buy on the Event's own Venue, after the tap callback", () => {
    jest.mocked(useActiveVenue).mockReturnValue(KALSHI);
    const beforeOpen = jest.fn();
    const { result } = renderHook(() => useOrderNextTrendingOutcome());

    const opened = result.current(EVENT, MARKET, YES, beforeOpen);

    expect(opened).toBe(true);
    expect(beforeOpen).toHaveBeenCalledTimes(1);
    expect(mockOpenOrderFlow).toHaveBeenCalledWith({
      action: 'buy',
      eventId: 'kxnfl-1',
      venueId: 'kalshi',
      marketId: MARKET.id,
      side: 'yes',
      outcomeLabel: 'Yes',
      eventTitle: 'Packers vs Steelers',
      eventImageUrl: undefined,
      askPrice: '0.6',
    });
  });

  it.each([
    ['another Venue is active', POLYMARKET],
    ['the Active Venue is resolving', { status: 'resolving' } as const],
  ])(
    'refuses to buy from a stale card while %s, without tracking',
    (_, venue) => {
      jest.mocked(useActiveVenue).mockReturnValue(venue);
      const beforeOpen = jest.fn();
      const { result } = renderHook(() => useOrderNextTrendingOutcome());

      const opened = result.current(EVENT, MARKET, YES, beforeOpen);

      expect(opened).toBe(false);
      expect(beforeOpen).not.toHaveBeenCalled();
      expect(mockOpenOrderFlow).not.toHaveBeenCalled();
    },
  );
});
