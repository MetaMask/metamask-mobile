import { useMemo, useRef, useState } from 'react';
import {
  formatUsd,
  seededRandom,
  type ProtoCryptoEvent,
  type ProtoGameEvent,
  type ProtoStandardEvent,
} from './fixtures';
import { useLiveTicker, usePrototypeMotion } from './usePrototypeMotion';
import type { PredictMarketChartSeries } from '../views/PredictEvent/internal/PredictMarketChart';

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const hashSeed = (text: string) =>
  text.split('').reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7);

/** A random walk of probabilities (0–1) that ends exactly at `end`. */
export const buildProbabilityWalk = (
  seed: number,
  length: number,
  end: number,
  roughness = 0.035,
) => {
  const random = seededRandom(seed);
  const raw: number[] = [];
  let value = 0.5;
  for (let index = 0; index < length; index++) {
    value = clamp(value + (random() - 0.5) * roughness * 2, 0.05, 0.95);
    raw.push(value);
  }
  const offset = end - raw[raw.length - 1];
  return raw.map((point, index) =>
    clamp(point + (offset * index) / (length - 1), 0.02, 0.98),
  );
};

export type GameRange = 'LIVE' | '1D' | '1W' | '1M' | '1Y';
export const GAME_RANGES: readonly GameRange[] = [
  'LIVE',
  '1D',
  '1W',
  '1M',
  '1Y',
];

const RANGE_SPAN_MS: Record<GameRange, number> = {
  LIVE: 15 * 60 * 1000,
  '1D': 24 * 3600 * 1000,
  '1W': 7 * 24 * 3600 * 1000,
  '1M': 30 * 24 * 3600 * 1000,
  '1Y': 365 * 24 * 3600 * 1000,
};

const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const QUARTERS = 4;

interface SportRules {
  quarterSeconds: number;
  /** Game-clock seconds advanced on each live tick. */
  clockStep: number;
  /** Chance a tick produces one scoring play. */
  scoreChance: number;
  /** Highest total one team can reach. */
  scoreCeiling: number;
  points: (roll: number) => number;
}

/** Touchdown, missed extra point, field goal, or safety. */
export const footballPoints = (roll: number) => {
  if (roll < 0.55) return 7;
  if (roll < 0.65) return 6;
  if (roll < 0.95) return 3;
  return 2;
};

const basketballPoints = (roll: number) => (roll < 0.72 ? 2 : 3);

const NFL_RULES: SportRules = {
  quarterSeconds: 15 * 60,
  clockStep: 20,
  scoreChance: 0.05,
  scoreCeiling: 56,
  points: footballPoints,
};

const NBA_RULES: SportRules = {
  quarterSeconds: 12 * 60,
  clockStep: 12,
  scoreChance: 0.28,
  scoreCeiling: 149,
  points: basketballPoints,
};

export const gameRulesFor = (league: string) =>
  league === 'NFL' ? NFL_RULES : NBA_RULES;

export interface LiveGameSnapshot {
  quarter: number;
  seconds: number;
  isFinal: boolean;
  awayScore: number;
  homeScore: number;
}

const parseQuarter = (period: string) => {
  const match = /Q([1-4])/.exec(period);
  return match ? Number(match[1]) : 1;
};

export const stepClock = (
  clock: Pick<LiveGameSnapshot, 'quarter' | 'seconds' | 'isFinal'>,
  quarterSeconds: number,
  step: number,
): Pick<LiveGameSnapshot, 'quarter' | 'seconds' | 'isFinal'> => {
  if (clock.isFinal) {
    return { quarter: clock.quarter, seconds: clock.seconds, isFinal: true };
  }
  const remaining = clock.seconds - step;
  if (remaining > 0) {
    return { quarter: clock.quarter, seconds: remaining, isFinal: false };
  }
  if (clock.quarter >= QUARTERS) {
    return { quarter: QUARTERS, seconds: 0, isFinal: true };
  }
  return {
    quarter: clock.quarter + 1,
    seconds: quarterSeconds + remaining,
    isFinal: false,
  };
};

/** Advances the game clock one tick and maybe adds one score. Stays put once final. */
export const applyGameTick = (
  state: LiveGameSnapshot,
  rules: SportRules,
  random: () => number,
): LiveGameSnapshot => {
  if (state.isFinal) return state;
  const clock = stepClock(state, rules.quarterSeconds, rules.clockStep);
  if (clock.isFinal || random() >= rules.scoreChance) {
    return { ...state, ...clock };
  }
  const points = rules.points(random());
  const homeScores = random() < 0.5;
  const awayScore = state.awayScore + (homeScores ? 0 : points);
  const homeScore = state.homeScore + (homeScores ? points : 0);
  if (awayScore > rules.scoreCeiling || homeScore > rules.scoreCeiling) {
    return { ...state, ...clock };
  }
  return { ...state, ...clock, awayScore, homeScore };
};

export interface LiveGameOptions {
  /**
   * Run the game clock one second per second instead of fast-forwarding, so a
   * feed card reads like a real broadcast clock.
   */
  realtime?: boolean;
  /** Start the game over a few ticks after the final whistle. */
  replay?: boolean;
}

/** Real-time play is far less eventful than the fast-forward, so score a bit more per tick. */
const REALTIME_SCORE_CHANCE = 0.02;
const REPLAY_HOLD_TICKS = 6;

/** `Q4 02:19`, the broadcast format the feed cards use. */
const padClock = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(
    safe % 60,
  ).padStart(2, '0')}`;
};

export const useLiveGame = (
  event: ProtoGameEvent,
  { realtime = false, replay = false }: LiveGameOptions = {},
) => {
  const { tickMs } = usePrototypeMotion();
  const seed = useMemo(() => hashSeed(event.id), [event.id]);
  const rules = useMemo(() => {
    const base = gameRulesFor(event.league);
    return realtime
      ? {
          ...base,
          clockStep: tickMs / 1000,
          scoreChance: REALTIME_SCORE_CHANCE,
        }
      : base;
  }, [event.league, realtime, tickMs]);
  const initialGame = useMemo<LiveGameSnapshot>(
    () => ({
      quarter: parseQuarter(event.period),
      seconds: event.clockSeconds,
      isFinal: false,
      awayScore: event.awayScore,
      homeScore: event.homeScore,
    }),
    [event],
  );
  const [game, setGame] = useState<LiveGameSnapshot>(initialGame);
  const [trail, setTrail] = useState(() =>
    buildProbabilityWalk(seed, 40, event.awayProbability / 100),
  );
  const gameRef = useRef(game);
  gameRef.current = game;
  const finalTicksRef = useRef(0);

  useLiveTicker(
    () => {
      const current = gameRef.current;
      if (current.isFinal) {
        finalTicksRef.current += 1;
        if (finalTicksRef.current >= REPLAY_HOLD_TICKS) {
          finalTicksRef.current = 0;
          gameRef.current = initialGame;
          setGame(initialGame);
          setTrail(buildProbabilityWalk(seed, 40, event.awayProbability / 100));
        }
        return;
      }
      const next = applyGameTick(current, rules, Math.random);
      const scored =
        next.awayScore -
        current.awayScore -
        (next.homeScore - current.homeScore);
      gameRef.current = next;
      setGame(next);
      setTrail((points) => {
        const last = points[points.length - 1];
        // Feed cards need odds that visibly tick, so real-time play gets more
        // noise, held near the opening price so a card never runs off.
        const noise = realtime ? 0.03 : 0.012;
        const pull = realtime ? (event.awayProbability / 100 - last) * 0.03 : 0;
        const value = clamp(
          last + scored * 0.01 + pull + (Math.random() - 0.5) * noise,
          0.03,
          0.97,
        );
        return [...points.slice(-119), value];
      });
    },
    event.isLive && (!game.isFinal || replay),
  );

  const awayProbability = Math.round(trail[trail.length - 1] * 100);

  const buildSeries = (range: GameRange): PredictMarketChartSeries[] => {
    const now = Date.now();
    const values =
      range === 'LIVE'
        ? trail
        : buildProbabilityWalk(
            seed + range.length * 97 + range.charCodeAt(1),
            60,
            awayProbability / 100,
            range === '1Y' ? 0.06 : 0.045,
          );
    const step = RANGE_SPAN_MS[range] / Math.max(1, values.length - 1);
    const toPoints = (invert: boolean) =>
      values.map((value, index) => ({
        time: now - (values.length - 1 - index) * step,
        value: invert ? 1 - value : value,
      }));
    return [
      {
        id: 'away',
        label: event.away.name,
        color: event.away.color,
        data: toPoints(false),
      },
      {
        id: 'home',
        label: event.home.name,
        color: event.home.color,
        data: toPoints(true),
      },
    ];
  };

  return {
    awayScore: game.awayScore,
    homeScore: game.homeScore,
    isFinal: game.isFinal,
    clockLabel: game.isFinal
      ? 'Final'
      : `Q${game.quarter} ${formatClock(game.seconds)}`,
    /** Zero-padded for the feed cards: `Q4 02:19`. */
    feedClockLabel: game.isFinal
      ? 'Final'
      : `Q${game.quarter} ${padClock(game.seconds)}`,
    isFinalPeriod: game.quarter >= QUARTERS,
    isClosing:
      !game.isFinal && game.quarter >= QUARTERS && game.seconds <= 2 * 60,
    awayProbability,
    homeProbability: 100 - awayProbability,
    buildSeries,
  };
};

export type CryptoPhase = 'live' | 'closing' | 'resolved';

const RESOLVED_HOLD_SECONDS = 5;
const CLOSING_SECONDS = 10;

const buildPriceHistory = (event: ProtoCryptoEvent, length: number) => {
  const random = seededRandom(hashSeed(event.id));
  const points: number[] = [];
  let price = event.priceToBeat - event.volatility * 3;
  for (let index = 0; index < length; index++) {
    price += (random() - 0.45) * event.volatility;
    points.push(price);
  }
  const offset = event.startPrice - points[points.length - 1];
  return points.map((point, index) => point + (offset * index) / (length - 1));
};

const upProbability = (
  price: number,
  target: number,
  volatility: number,
  secondsLeft: number,
) => {
  const spread = volatility * Math.sqrt(Math.max(1, secondsLeft) / 3);
  const z = (price - target) / spread;
  return clamp(Math.round(100 / (1 + Math.exp(-z * 1.6))), 1, 99);
};

export const useCryptoRound = (event: ProtoCryptoEvent) => {
  const { tickMs } = usePrototypeMotion();
  const [history, setHistory] = useState(() => buildPriceHistory(event, 60));
  const [target, setTarget] = useState(event.priceToBeat);
  const [secondsLeft, setSecondsLeft] = useState(
    event.startSeconds ?? event.roundSeconds,
  );
  const winnerRef = useRef<'up' | 'down' | null>(null);
  const resolvedForRef = useRef(0);
  const price = history[history.length - 1];

  useLiveTicker(() => {
    const step = tickMs / 1000;
    if (winnerRef.current) {
      resolvedForRef.current += step;
      if (resolvedForRef.current >= RESOLVED_HOLD_SECONDS) {
        winnerRef.current = null;
        resolvedForRef.current = 0;
        setTarget(price);
        setSecondsLeft(event.roundSeconds);
      }
      return;
    }
    setHistory((current) => {
      const last = current[current.length - 1];
      const drift = (Math.random() - 0.48) * event.volatility;
      return [...current.slice(-89), last + drift];
    });
    const next = secondsLeft - step;
    if (next <= 0) {
      winnerRef.current = price >= target ? 'up' : 'down';
      setSecondsLeft(0);
    } else {
      setSecondsLeft(next);
    }
  });

  const winner = winnerRef.current;
  const phase: CryptoPhase = winner
    ? 'resolved'
    : secondsLeft <= CLOSING_SECONDS
      ? 'closing'
      : 'live';
  const upPrice = winner
    ? winner === 'up'
      ? 99
      : 1
    : upProbability(price, target, event.volatility, secondsLeft);

  return {
    price,
    history,
    target,
    delta: price - target,
    secondsLeft,
    countdown: formatClock(secondsLeft),
    /** Zero-padded for the feed cards: `03:19`. */
    feedCountdown: padClock(secondsLeft),
    phase,
    winner,
    upPrice,
    downPrice: 100 - upPrice,
  };
};

export const formatCryptoPrice = (value: number) => formatUsd(value);

const ODDS_POINTS = 28;
/** Live odds wander at most this many cents away from the fixture price. */
const ODDS_BAND = 8;

/** One mean-reverting step, so prices wiggle around the fixture instead of running off. */
export const stepOdds = (last: number, base: number, noise: number) => {
  const pull = (base - last) * 0.2;
  const next = Math.round(last + pull + noise * 3);
  return clamp(
    next,
    Math.max(2, base - ODDS_BAND),
    Math.min(96, base + ODDS_BAND),
  );
};

/** Live cent prices and a short trail for each leading outcome on a live market. */
export const useLiveOdds = (event: ProtoStandardEvent) => {
  const shown = event.outcomes.slice(0, 2);
  const seed = useMemo(() => hashSeed(event.id), [event.id]);
  const [trails, setTrails] = useState(() =>
    shown.map((outcome, index) =>
      buildProbabilityWalk(
        seed + index * 17,
        ODDS_POINTS,
        outcome.price / 100,
        0.025,
      ).map((value) =>
        clamp(
          Math.round(value * 100),
          Math.max(2, outcome.price - ODDS_BAND),
          Math.min(96, outcome.price + ODDS_BAND),
        ),
      ),
    ),
  );

  useLiveTicker(() => {
    setTrails((current) => {
      const stepped = current.map((trail, index) => {
        const last = trail[trail.length - 1];
        const value = stepOdds(last, shown[index].price, Math.random() - 0.5);
        return [...trail.slice(-(ODDS_POINTS - 1)), value];
      });
      const leader = stepped[0]?.[stepped[0].length - 1];
      const challenger = stepped[1];
      if (
        challenger &&
        leader !== undefined &&
        challenger[challenger.length - 1] >= leader
      ) {
        stepped[1] = [...challenger.slice(0, -1), Math.max(2, leader - 1)];
      }
      return stepped;
    });
  });

  return shown.map((outcome, index) => ({
    outcome,
    price: trails[index][trails[index].length - 1],
    trail: trails[index],
  }));
};

const VOLUME_UNITS: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };

/** `$1.0M` → 1,000,000. Unrecognised labels read as zero. */
export const parseVolume = (label: string) => {
  const match = /^\$?([\d.]+)\s*([KMB])?/i.exec(label.trim());
  if (!match) return 0;
  const amount = Number(match[1]);
  return Number.isFinite(amount)
    ? amount * (VOLUME_UNITS[(match[2] ?? '').toUpperCase()] ?? 1)
    : 0;
};

/** 1,040,000 → `$1.0M`, one decimal like the Figma cards. */
export const formatVolume = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${Math.round(value)}`;
};

/** Volume added on one tick: a small slice of the opening volume. */
export const stepVolume = (current: number, seed: number, roll: number) =>
  current + seed * (0.001 + roll * 0.006);

/** Chance a tick brings in a new comment. */
const COMMENT_CHANCE = 0.35;

/**
 * Simulated trading volume and comment count that keep growing, for the
 * footer of every feed card. Volume is a formatted label, comments a number.
 */
export const useLiveEngagement = (
  seed: { volume: string; comments: number },
  isEnabled = true,
) => {
  const seedVolume = useMemo(() => parseVolume(seed.volume), [seed.volume]);
  const [state, setState] = useState({
    volume: seedVolume,
    comments: seed.comments,
  });
  useLiveTicker(() => {
    setState((current) => ({
      volume: stepVolume(current.volume, seedVolume, Math.random()),
      comments: current.comments + (Math.random() < COMMENT_CHANCE ? 1 : 0),
    }));
  }, isEnabled);
  return { volume: formatVolume(state.volume), comments: state.comments };
};

/** A cents price that wiggles around `base`, for markets with no live game behind them. */
export const useTickingPrice = (base: number, isEnabled = true) => {
  const [price, setPrice] = useState(base);
  useLiveTicker(() => {
    setPrice((current) => stepOdds(current, base, Math.random() - 0.5));
  }, isEnabled);
  return price;
};

/** The live state `useCryptoRound` returns, for cards that share one round. */
export type CryptoRoundState = ReturnType<typeof useCryptoRound>;
