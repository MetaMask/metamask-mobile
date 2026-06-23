import type {
  GameUpdate,
  PredictGamePeriod,
  PredictGameStatus,
  PredictMarketGame,
} from '../../types';
import { parseScore } from '../../utils/gameParser';
import { getRosterForTeam } from './rosters';
import type {
  GameEvent,
  GameEventSource,
  GameFlashMarketEvent,
  GamePlayEvent,
  GamePlayType,
} from './types';

export interface SimulatedGameEventSourceOptions {
  game: PredictMarketGame;
  /** Injectable randomness for deterministic tests. Defaults to Math.random. */
  rng?: () => number;
  /** Injectable clock for deterministic tests. Defaults to Date.now. */
  now?: () => number;
  /** [min, max] delay between simulated non-scoring filler events. */
  fillerIntervalMs?: [number, number];
  /** Cadence for simulated flash micro-markets. */
  flashIntervalMs?: number;
  /** How long a flash market stays open. */
  flashWindowMs?: number;
  maxBacklog?: number;
}

type TeamSide = 'home' | 'away';

interface PlayerShooting {
  made: number;
  attempts: number;
}

const DEFAULT_FILLER_INTERVAL_MS: [number, number] = [3_500, 9_000];
const DEFAULT_FLASH_INTERVAL_MS = 40_000;
const DEFAULT_FLASH_WINDOW_MS = 15_000;
const DEFAULT_MAX_BACKLOG = 200;

const SCORING_DESCRIPTIONS: Record<string, string[]> = {
  three_made: [
    'Drills a three from deep',
    'Knocks down the corner three',
    'Pulls up from way downtown — splash',
  ],
  shot_made: [
    'Lays it in off the drive',
    'Mid-range jumper drops',
    'Strong finish at the rim',
    'Turnaround fade — good',
  ],
  free_throw: ['Sinks the free throw'],
};

const FILLER_DESCRIPTIONS: Partial<Record<GamePlayType, string[]>> = {
  shot_missed: [
    "Missed 19' pull-up jumper",
    'Misses the three from the wing',
    'Driving layup rolls off the rim',
    "Missed 19' lead-taking two",
  ],
  offensive_rebound: ['Offensive rebound'],
  defensive_rebound: ['Defensive rebound'],
  turnover: ['Turnover — pass picked off', 'Loses the handle out of bounds'],
  foul: ['Personal foul on the drive', 'Reach-in foul'],
  timeout: ['Timeout on the floor'],
};

/** Weighted filler play types: [type, cumulative weight ceiling 0..1]. */
const FILLER_WEIGHTS: [GamePlayType, number][] = [
  ['shot_missed', 0.4],
  ['defensive_rebound', 0.6],
  ['offensive_rebound', 0.7],
  ['turnover', 0.85],
  ['foul', 0.95],
  ['timeout', 1],
];

const SHOOTING_PLAY_TYPES: ReadonlySet<GamePlayType> = new Set([
  'shot_made',
  'shot_missed',
  'three_made',
]);

/**
 * Cosmetically winds a game clock down between real anchors. Supports "M:SS"
 * and decimal-seconds ("30.3") formats; anything else passes through.
 */
export const decrementClock = (
  elapsed: string | null,
  seconds: number,
): string | null => {
  if (!elapsed) return elapsed;

  const minuteMatch = elapsed.match(/^(\d+):(\d{2})$/);
  if (minuteMatch) {
    const total = Math.max(
      0,
      parseInt(minuteMatch[1], 10) * 60 +
        parseInt(minuteMatch[2], 10) -
        seconds,
    );
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  }

  const numeric = Number(elapsed);
  if (!Number.isNaN(numeric)) {
    return String(Math.max(0, Number((numeric - seconds).toFixed(1))));
  }

  return elapsed;
};

/**
 * Simulated play-by-play source anchored to real score/period updates from
 * the Polymarket sports WebSocket. Score-changing events always reconcile
 * exactly to the latest real anchor — the simulation never drifts from
 * reality. Between anchors it emits plausible non-scoring filler events and
 * periodic flash micro-markets.
 */
export class SimulatedGameEventSource implements GameEventSource {
  readonly #game: PredictMarketGame;
  readonly #rng: () => number;
  readonly #now: () => number;
  readonly #fillerIntervalMs: [number, number];
  readonly #flashIntervalMs: number;
  readonly #flashWindowMs: number;
  readonly #maxBacklog: number;

  #subscribers = new Set<(event: GameEvent) => void>();
  #backlog: GameEvent[] = [];
  #seq = 0;
  #running = false;
  #fillerTimer: ReturnType<typeof setTimeout> | null = null;
  #flashTimer: ReturnType<typeof setInterval> | null = null;

  #score: { home: number; away: number };
  #period: PredictGamePeriod | null;
  #clock: string | null;
  #status: PredictGameStatus;
  #playerShooting = new Map<string, PlayerShooting>();

  constructor(options: SimulatedGameEventSourceOptions) {
    this.#game = options.game;
    this.#rng = options.rng ?? Math.random;
    this.#now = options.now ?? Date.now;
    this.#fillerIntervalMs =
      options.fillerIntervalMs ?? DEFAULT_FILLER_INTERVAL_MS;
    this.#flashIntervalMs =
      options.flashIntervalMs ?? DEFAULT_FLASH_INTERVAL_MS;
    this.#flashWindowMs = options.flashWindowMs ?? DEFAULT_FLASH_WINDOW_MS;
    this.#maxBacklog = options.maxBacklog ?? DEFAULT_MAX_BACKLOG;

    this.#score = {
      home: options.game.score?.home ?? 0,
      away: options.game.score?.away ?? 0,
    };
    this.#period = options.game.period;
    this.#clock = options.game.elapsed;
    this.#status = options.game.status;
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#scheduleFiller();
    this.#flashTimer = setInterval(() => {
      this.#emitFlashMarket();
    }, this.#flashIntervalMs);
  }

  stop(): void {
    this.#running = false;
    if (this.#fillerTimer) {
      clearTimeout(this.#fillerTimer);
      this.#fillerTimer = null;
    }
    if (this.#flashTimer) {
      clearInterval(this.#flashTimer);
      this.#flashTimer = null;
    }
  }

  syncAnchor(update: GameUpdate): void {
    const previousPeriod = this.#period;
    const newScore = parseScore(update.score, this.#game.league);

    if (update.period && update.period !== previousPeriod) {
      if (previousPeriod) {
        this.#emitPeriodEvent('period_end', previousPeriod);
      }
      this.#emitPeriodEvent('period_start', update.period);
      // Flash markets feel most alive at period transitions.
      this.#emitFlashMarket();
    }

    this.#period = update.period ?? this.#period;
    this.#clock = update.elapsed || this.#clock;
    this.#status = update.status ?? this.#status;

    if (newScore) {
      this.#reconcileScore('away', newScore.away);
      this.#reconcileScore('home', newScore.home);
    }
  }

  subscribe(callback: (event: GameEvent) => void): () => void {
    this.#subscribers.add(callback);
    return () => {
      this.#subscribers.delete(callback);
    };
  }

  getBacklog(): GameEvent[] {
    return [...this.#backlog];
  }

  #emit(event: GameEvent): void {
    this.#backlog.push(event);
    if (this.#backlog.length > this.#maxBacklog) {
      this.#backlog = this.#backlog.slice(-this.#maxBacklog);
    }
    this.#subscribers.forEach((callback) => callback(event));
  }

  #nextId(): string {
    this.#seq += 1;
    return `${this.#game.id}-${this.#seq}`;
  }

  #teamFor(side: TeamSide) {
    return side === 'home' ? this.#game.homeTeam : this.#game.awayTeam;
  }

  #pickPlayer(side: TeamSide): string {
    const roster = getRosterForTeam(this.#teamFor(side).abbreviation);
    return roster[Math.floor(this.#rng() * roster.length)];
  }

  #pickDescription(pool: string[]): string {
    return pool[Math.floor(this.#rng() * pool.length)];
  }

  #recordShot(player: string, made: boolean): string {
    const stats = this.#playerShooting.get(player) ?? { made: 0, attempts: 0 };
    stats.attempts += 1;
    if (made) stats.made += 1;
    this.#playerShooting.set(player, stats);
    return `${stats.made}/${stats.attempts}`;
  }

  /**
   * Emits scoring events that bring the simulated score for one side exactly
   * to the real anchored total, splitting larger deltas into plausible plays.
   */
  #reconcileScore(side: TeamSide, anchoredTotal: number): void {
    let remaining = anchoredTotal - this.#score[side];
    if (remaining <= 0) {
      // Score corrections downward (rare provider fixups) snap silently.
      this.#score[side] = anchoredTotal;
      return;
    }

    while (remaining > 0) {
      const points =
        remaining >= 3 && this.#rng() < 0.4 ? 3 : Math.min(remaining, 2);
      const playType: GamePlayType =
        points === 3 ? 'three_made' : points === 2 ? 'shot_made' : 'free_throw';
      this.#score[side] += points;
      remaining -= points;

      const player = this.#pickPlayer(side);
      const isShot = playType !== 'free_throw';
      const statLine = isShot ? this.#recordShot(player, true) : undefined;

      const event: GamePlayEvent = {
        id: this.#nextId(),
        kind: 'play',
        playType,
        timestamp: this.#now(),
        period: this.#period,
        clock: this.#clock,
        teamSide: side,
        teamAbbreviation: this.#teamFor(side).abbreviation,
        player: { name: player, ...(statLine && { statLine }) },
        description: this.#pickDescription(SCORING_DESCRIPTIONS[playType]),
        scoreAfter: { ...this.#score },
        points,
      };
      this.#emit(event);
    }
  }

  #emitPeriodEvent(
    playType: 'period_start' | 'period_end',
    period: PredictGamePeriod,
  ): void {
    const event: GamePlayEvent = {
      id: this.#nextId(),
      kind: 'play',
      playType,
      timestamp: this.#now(),
      period,
      clock: this.#clock,
      teamSide: 'home',
      teamAbbreviation: this.#game.homeTeam.abbreviation,
      description:
        playType === 'period_start' ? `${period} underway` : `End of ${period}`,
      scoreAfter: { ...this.#score },
    };
    this.#emit(event);
  }

  #scheduleFiller(): void {
    if (!this.#running) return;
    const [min, max] = this.#fillerIntervalMs;
    const delay = min + this.#rng() * (max - min);
    this.#fillerTimer = setTimeout(() => {
      this.#emitFillerEvent();
      this.#scheduleFiller();
    }, delay);
  }

  #emitFillerEvent(): void {
    if (this.#status === 'ended') return;

    const roll = this.#rng();
    const playType =
      FILLER_WEIGHTS.find(([, ceiling]) => roll < ceiling)?.[0] ??
      'shot_missed';
    const side: TeamSide = this.#rng() < 0.5 ? 'home' : 'away';
    const player = this.#pickPlayer(side);
    const statLine = SHOOTING_PLAY_TYPES.has(playType)
      ? this.#recordShot(player, false)
      : undefined;

    this.#clock = decrementClock(this.#clock, 5 + Math.floor(this.#rng() * 10));

    const descriptions = FILLER_DESCRIPTIONS[playType] ?? ['Play continues'];
    const event: GamePlayEvent = {
      id: this.#nextId(),
      kind: 'play',
      playType,
      timestamp: this.#now(),
      period: this.#period,
      clock: this.#clock,
      teamSide: side,
      teamAbbreviation: this.#teamFor(side).abbreviation,
      player: { name: player, ...(statLine && { statLine }) },
      description: this.#pickDescription(descriptions),
      scoreAfter: { ...this.#score },
    };
    this.#emit(event);
  }

  #emitFlashMarket(): void {
    if (this.#status === 'ended') return;

    const homeRoster = getRosterForTeam(this.#game.homeTeam.abbreviation);
    const awayRoster = getRosterForTeam(this.#game.awayTeam.abbreviation);
    const pool = [...homeRoster, ...awayRoster];
    const picked: string[] = [];
    while (picked.length < 3 && pool.length > 0) {
      const index = Math.floor(this.#rng() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }

    const id = this.#nextId();
    const event: GameFlashMarketEvent = {
      id,
      kind: 'flash',
      timestamp: this.#now(),
      question: `Pick a player to score a point (FT or FG) in ${
        this.#period ?? 'this period'
      }`,
      options: picked.map((label, index) => ({
        id: `${id}-option-${index}`,
        label,
        impliedPct: 15 + Math.round(this.#rng() * 45),
      })),
      closesAt: this.#now() + this.#flashWindowMs,
    };
    this.#emit(event);
  }
}
