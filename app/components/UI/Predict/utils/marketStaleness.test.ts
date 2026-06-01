import {
  PredictMarketStatus,
  Recurrence,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeGroup,
} from '../types';
import {
  filterVisibleMarketOutcomes,
  getPredictMarketProbabilityPenalty,
  getPredictMarketTimePenalty,
  getVisiblePredictMarket,
  getVisiblePredictMarkets,
  isPredictMarketExpiredByTime,
  isPredictOutcomeDead,
} from './marketStaleness';

const NOW = new Date('2026-03-18T12:00:00.000Z');

const createOutcome = ({
  id,
  price,
  status = PredictMarketStatus.OPEN,
}: {
  id: string;
  price?: number;
  status?: PredictMarketStatus;
}): PredictOutcome => ({
  id,
  providerId: 'polymarket',
  marketId: 'market-1',
  title: id,
  description: id,
  image: '',
  status,
  tokens:
    price === undefined
      ? []
      : [
          { id: `${id}-yes`, title: 'Yes', price },
          { id: `${id}-no`, title: 'No', price: 1 - price },
        ],
  volume: 100,
  groupItemTitle: id,
});

const createMarket = ({
  id,
  outcomes = [createOutcome({ id: 'outcome-1', price: 0.5 })],
  status = PredictMarketStatus.OPEN,
  recurrence = Recurrence.NONE,
  endDate,
  isHighlighted,
  outcomeGroups,
  game,
}: {
  id: string;
  outcomes?: PredictOutcome[];
  status?: PredictMarketStatus;
  recurrence?: Recurrence;
  endDate?: string;
  isHighlighted?: boolean;
  outcomeGroups?: PredictOutcomeGroup[];
  game?: PredictMarket['game'];
}): PredictMarket => ({
  id,
  providerId: 'polymarket',
  slug: id,
  title: id,
  description: id,
  image: '',
  status,
  recurrence,
  category: 'trending',
  tags: [],
  outcomes,
  ...(outcomeGroups && { outcomeGroups }),
  liquidity: 100,
  volume: 100,
  ...(endDate && { endDate }),
  ...(isHighlighted && { isHighlighted }),
  ...(game && { game }),
});

const createGame = (
  status: NonNullable<PredictMarket['game']>['status'],
): NonNullable<PredictMarket['game']> => ({
  id: 'game-1',
  startTime: '2026-03-18T10:00:00.000Z',
  status,
  league: 'nba',
  elapsed: null,
  period: null,
  score: null,
  homeTeam: {
    id: 'home',
    name: 'Home',
    logo: '',
    abbreviation: 'HOME',
    color: 'black',
  },
  awayTeam: {
    id: 'away',
    name: 'Away',
    logo: '',
    abbreviation: 'AWAY',
    color: 'white',
  },
});

describe('marketStaleness', () => {
  describe('isPredictOutcomeDead', () => {
    it('treats probabilities at or beyond the dead thresholds as dead', () => {
      expect(
        isPredictOutcomeDead(createOutcome({ id: 'high', price: 0.95 })),
      ).toBe(true);
      expect(
        isPredictOutcomeDead(createOutcome({ id: 'low', price: 0.05 })),
      ).toBe(true);
    });

    it('keeps probabilities inside the dead thresholds live', () => {
      expect(
        isPredictOutcomeDead(createOutcome({ id: 'high-live', price: 0.949 })),
      ).toBe(false);
      expect(
        isPredictOutcomeDead(createOutcome({ id: 'low-live', price: 0.051 })),
      ).toBe(false);
    });

    it('treats missing probability as dead', () => {
      expect(isPredictOutcomeDead(createOutcome({ id: 'missing' }))).toBe(true);
    });
  });

  describe('filterVisibleMarketOutcomes', () => {
    it('hides a market when all outcomes are dead', () => {
      const market = createMarket({
        id: 'all-dead',
        outcomes: [
          createOutcome({ id: 'dead-high', price: 0.97 }),
          createOutcome({ id: 'dead-low', price: 0.03 }),
        ],
      });

      expect(filterVisibleMarketOutcomes(market)).toBeNull();
    });

    it('keeps live outcomes in their original order', () => {
      const liveOne = createOutcome({ id: 'live-one', price: 0.4 });
      const liveTwo = createOutcome({ id: 'live-two', price: 0.6 });
      const market = createMarket({
        id: 'partial',
        outcomes: [
          createOutcome({ id: 'dead-high', price: 0.97 }),
          liveOne,
          createOutcome({ id: 'dead-low', price: 0.03 }),
          liveTwo,
        ],
      });

      expect(filterVisibleMarketOutcomes(market)?.outcomes).toEqual([
        liveOne,
        liveTwo,
      ]);
    });

    it('keeps outcome groups synchronized with visible outcomes', () => {
      const live = createOutcome({ id: 'live', price: 0.5 });
      const dead = createOutcome({ id: 'dead', price: 0.99 });
      const market = createMarket({
        id: 'grouped',
        outcomes: [live, dead],
        outcomeGroups: [
          {
            key: 'main',
            outcomes: [live, dead],
            subgroups: [
              { key: 'live-subgroup', outcomes: [live] },
              { key: 'dead-subgroup', outcomes: [dead] },
            ],
          },
        ],
      });

      expect(filterVisibleMarketOutcomes(market)?.outcomeGroups).toEqual([
        {
          key: 'main',
          outcomes: [live],
          subgroups: [{ key: 'live-subgroup', outcomes: [live] }],
        },
      ]);
    });

    it('omits outcomeGroups when all groups are filtered out', () => {
      const live = createOutcome({ id: 'live', price: 0.5 });
      const dead = createOutcome({ id: 'dead', price: 0.99 });
      const market = createMarket({
        id: 'groups-pruned',
        outcomes: [live, dead],
        outcomeGroups: [
          {
            key: 'dead-only',
            outcomes: [dead],
          },
        ],
      });

      expect(filterVisibleMarketOutcomes(market)).toEqual({
        ...market,
        outcomes: [live],
      });
    });
  });

  describe('getVisiblePredictMarket', () => {
    it('hides markets that are not open', () => {
      const market = createMarket({
        id: 'resolved',
        status: PredictMarketStatus.RESOLVED,
      });

      expect(getVisiblePredictMarket(market, { now: NOW })).toBeNull();
    });

    it('hides ended games', () => {
      const market = createMarket({
        id: 'ended-game',
        game: createGame('ended'),
      });

      expect(getVisiblePredictMarket(market, { now: NOW })).toBeNull();
    });

    it('hides expired daily markets', () => {
      const market = createMarket({
        id: 'expired-daily',
        recurrence: Recurrence.DAILY,
        endDate: '2026-03-18T11:59:00.000Z',
      });

      expect(getVisiblePredictMarket(market, { now: NOW })).toBeNull();
    });

    it('does not hide expired non-daily markets by time alone', () => {
      const market = createMarket({
        id: 'expired-none',
        recurrence: Recurrence.NONE,
        endDate: '2026-03-18T11:59:00.000Z',
      });

      expect(getVisiblePredictMarket(market, { now: NOW })).toEqual(market);
    });

    it('keeps highlighted open markets without staleness filtering', () => {
      const market = createMarket({
        id: 'highlight',
        isHighlighted: true,
        recurrence: Recurrence.DAILY,
        endDate: '2026-03-18T11:59:00.000Z',
        outcomes: [createOutcome({ id: 'dead-high', price: 0.99 })],
      });

      expect(getVisiblePredictMarket(market, { now: NOW })).toEqual(market);
    });

    it('keeps game markets without filtering stale-priced outcomes', () => {
      const market = createMarket({
        id: 'game-market',
        game: createGame('scheduled'),
        outcomes: [
          createOutcome({ id: 'favorite', price: 0.97 }),
          createOutcome({ id: 'draw', price: 0.04 }),
          createOutcome({ id: 'underdog', price: 0.03 }),
        ],
      });

      expect(getVisiblePredictMarket(market, { now: NOW })).toEqual(market);
    });
  });

  describe('penalties and ranking', () => {
    it('applies probability staleness penalty from the original market outcomes', () => {
      const market = createMarket({
        id: 'stale-top-outcome',
        outcomes: [
          createOutcome({ id: 'dead-high', price: 0.97 }),
          createOutcome({ id: 'live', price: 0.5 }),
        ],
      });

      expect(getPredictMarketProbabilityPenalty(market)).toBeCloseTo(0.8);
    });

    it('applies last-hour time penalty to daily markets', () => {
      const market = createMarket({
        id: 'last-hour',
        recurrence: Recurrence.DAILY,
        endDate: '2026-03-18T12:30:00.000Z',
      });

      expect(getPredictMarketTimePenalty(market, { now: NOW })).toBe(0.5);
    });

    it('does not apply last-hour time penalty to non-daily non-game markets', () => {
      const market = createMarket({
        id: 'last-hour-none',
        recurrence: Recurrence.NONE,
        endDate: '2026-03-18T12:30:00.000Z',
      });

      expect(getPredictMarketTimePenalty(market, { now: NOW })).toBe(1);
    });

    it('detects time expiry separately from ranking penalties', () => {
      const market = createMarket({
        id: 'expired-daily',
        recurrence: Recurrence.DAILY,
        endDate: '2026-03-18T12:00:00.000Z',
      });

      expect(isPredictMarketExpiredByTime(market, { now: NOW })).toBe(true);
    });

    it('ranks highlighted markets first and stale markets behind live markets', () => {
      const highlighted = createMarket({
        id: 'highlighted',
        isHighlighted: true,
        outcomes: [createOutcome({ id: 'highlighted-dead', price: 0.99 })],
      });
      const stale = createMarket({
        id: 'stale',
        recurrence: Recurrence.DAILY,
        endDate: '2026-03-18T12:30:00.000Z',
        outcomes: [
          createOutcome({ id: 'stale-dead', price: 0.99 }),
          createOutcome({ id: 'stale-live', price: 0.5 }),
        ],
      });
      const live = createMarket({
        id: 'live',
        outcomes: [createOutcome({ id: 'live-outcome', price: 0.5 })],
      });

      expect(
        getVisiblePredictMarkets([stale, highlighted, live], { now: NOW }).map(
          (market) => market.id,
        ),
      ).toEqual(['highlighted', 'live', 'stale']);
    });

    it('does not apply staleness ranking penalties to game markets', () => {
      const stalePricedGame = createMarket({
        id: 'stale-priced-game',
        game: createGame('scheduled'),
        outcomes: [createOutcome({ id: 'heavy-favorite', price: 0.99 })],
      });
      const liveOne = createMarket({ id: 'live-one' });
      const liveTwo = createMarket({ id: 'live-two' });

      expect(
        getVisiblePredictMarkets([stalePricedGame, liveOne, liveTwo], {
          now: NOW,
        }).map((market) => market.id),
      ).toEqual(['stale-priced-game', 'live-one', 'live-two']);
    });

    it('preserves original order when ranking scores tie', () => {
      const first = createMarket({ id: 'first' });
      const second = createMarket({ id: 'second' });

      expect(
        getVisiblePredictMarkets([first, second], { now: NOW }).map(
          (market) => market.id,
        ),
      ).toEqual(['first', 'second']);
    });
  });
});
