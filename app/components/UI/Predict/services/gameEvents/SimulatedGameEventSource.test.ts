import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import type { GameUpdate, PredictMarketGame } from '../../types';
import {
  decrementClock,
  SimulatedGameEventSource,
} from './SimulatedGameEventSource';
import type { GameEvent, GamePlayEvent } from './types';

const buildGame = (
  overrides: Partial<PredictMarketGame> = {},
): PredictMarketGame => ({
  id: 'game-1',
  startTime: '2026-06-10T00:00:00Z',
  status: 'ongoing',
  league: 'nba',
  elapsed: '8:00',
  period: 'Q3',
  score: { away: 70, home: 72, raw: '70-72' },
  homeTeam: {
    id: 'team-nyk',
    name: 'New York Knicks',
    logo: '',
    abbreviation: 'NYK',
    color: TEST_HEX_COLORS.TEAM_GSW,
  },
  awayTeam: {
    id: 'team-sas',
    name: 'San Antonio Spurs',
    logo: '',
    abbreviation: 'SAS',
    color: TEST_HEX_COLORS.PURE_BLACK,
  },
  ...overrides,
});

const buildUpdate = (overrides: Partial<GameUpdate> = {}): GameUpdate => ({
  gameId: 'game-1',
  score: '70-72',
  elapsed: '7:30',
  period: 'Q3',
  status: 'ongoing',
  ...overrides,
});

const createSource = (
  options: Partial<
    ConstructorParameters<typeof SimulatedGameEventSource>[0]
  > = {},
) =>
  new SimulatedGameEventSource({
    game: buildGame(),
    rng: () => 0.5,
    now: () => 1_000,
    ...options,
  });

const collectEvents = (source: SimulatedGameEventSource) => {
  const events: GameEvent[] = [];
  source.subscribe((event) => events.push(event));
  return events;
};

const playEvents = (events: GameEvent[]): GamePlayEvent[] =>
  events.filter((event): event is GamePlayEvent => event.kind === 'play');

describe('decrementClock', () => {
  it('decrements an M:SS clock and pads seconds', () => {
    expect(decrementClock('8:05', 10)).toBe('7:55');
  });

  it('floors an M:SS clock at 0:00', () => {
    expect(decrementClock('0:05', 30)).toBe('0:00');
  });

  it('decrements a decimal-seconds clock', () => {
    expect(decrementClock('30.3', 10)).toBe('20.3');
  });

  it('passes through unrecognized formats and null', () => {
    expect(decrementClock('HT', 10)).toBe('HT');
    expect(decrementClock(null, 10)).toBeNull();
  });
});

describe('SimulatedGameEventSource', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('syncAnchor score reconciliation', () => {
    it('emits scoring events that reconcile exactly to the anchored score', () => {
      const source = createSource();
      const events = collectEvents(source);

      source.syncAnchor(buildUpdate({ score: '73-72' }));

      const scoringEvents = playEvents(events);
      expect(scoringEvents.length).toBeGreaterThan(0);
      const lastEvent = scoringEvents[scoringEvents.length - 1];
      expect(lastEvent.scoreAfter).toEqual({ away: 73, home: 72 });
      expect(lastEvent.teamSide).toBe('away');
    });

    it('splits a multi-point delta into multiple plausible scoring plays', () => {
      const source = createSource();
      const events = collectEvents(source);

      source.syncAnchor(buildUpdate({ score: '70-77' }));

      const scoringEvents = playEvents(events);
      expect(scoringEvents.length).toBeGreaterThan(1);
      const totalPoints = scoringEvents.reduce(
        (sum, event) => sum + (event.points ?? 0),
        0,
      );
      expect(totalPoints).toBe(5);
      expect(scoringEvents[scoringEvents.length - 1].scoreAfter).toEqual({
        away: 70,
        home: 77,
      });
    });

    it('attributes scoring plays to roster players of the scoring team', () => {
      const source = createSource();
      const events = collectEvents(source);

      source.syncAnchor(buildUpdate({ score: '72-72' }));

      const [event] = playEvents(events);
      expect(event.player?.name).toBeDefined();
      expect(event.teamAbbreviation).toBe('SAS');
    });

    it('snaps silently on downward score corrections', () => {
      const source = createSource();
      const events = collectEvents(source);

      source.syncAnchor(buildUpdate({ score: '69-72' }));

      expect(events).toHaveLength(0);
    });
  });

  describe('syncAnchor period transitions', () => {
    it('emits period_end and period_start events on a period change', () => {
      const source = createSource();
      const events = collectEvents(source);

      source.syncAnchor(buildUpdate({ period: 'Q4', elapsed: '12:00' }));

      const periodEvents = playEvents(events).map((event) => event.playType);
      expect(periodEvents).toContain('period_end');
      expect(periodEvents).toContain('period_start');
    });

    it('emits a flash market at period transitions', () => {
      const source = createSource();
      const events = collectEvents(source);

      source.syncAnchor(buildUpdate({ period: 'Q4' }));

      expect(events.some((event) => event.kind === 'flash')).toBe(true);
    });
  });

  describe('filler loop', () => {
    it('emits non-scoring filler events on its cadence after start', () => {
      const source = createSource({ fillerIntervalMs: [1_000, 1_000] });
      const events = collectEvents(source);

      source.start();
      jest.advanceTimersByTime(3_500);

      const fillers = playEvents(events);
      expect(fillers).toHaveLength(3);
      fillers.forEach((event) => {
        expect(event.points).toBeUndefined();
        expect(event.scoreAfter).toEqual({ away: 70, home: 72 });
      });
    });

    it('stops emitting after stop()', () => {
      const source = createSource({ fillerIntervalMs: [1_000, 1_000] });
      const events = collectEvents(source);

      source.start();
      jest.advanceTimersByTime(1_500);
      source.stop();
      const countAtStop = events.length;
      jest.advanceTimersByTime(10_000);

      expect(events).toHaveLength(countAtStop);
    });
  });

  describe('flash markets', () => {
    it('emits flash markets with three options and a close timestamp', () => {
      const source = createSource({
        flashIntervalMs: 2_000,
        flashWindowMs: 15_000,
        fillerIntervalMs: [60_000, 60_000],
      });
      const events = collectEvents(source);

      source.start();
      jest.advanceTimersByTime(2_000);

      const flash = events.find((event) => event.kind === 'flash');
      expect(flash).toBeDefined();
      if (flash?.kind === 'flash') {
        expect(flash.options).toHaveLength(3);
        expect(flash.closesAt).toBe(16_000);
      }
    });
  });

  describe('subscribe / backlog', () => {
    it('returns emitted events from getBacklog and supports unsubscribe', () => {
      const source = createSource();
      const events: GameEvent[] = [];
      const unsubscribe = source.subscribe((event) => events.push(event));

      source.syncAnchor(buildUpdate({ score: '72-72' }));
      unsubscribe();
      source.syncAnchor(buildUpdate({ score: '74-72' }));

      expect(events).toHaveLength(1);
      expect(source.getBacklog().length).toBeGreaterThan(events.length);
    });
  });
});
