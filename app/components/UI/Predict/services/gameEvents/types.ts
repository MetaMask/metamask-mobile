import type { GameUpdate, PredictGamePeriod } from '../../types';

/**
 * Granular play-by-play event types for a live game feed. Modeled on
 * basketball but generic enough for other sports (a "shot" is any scoring
 * attempt).
 */
export type GamePlayType =
  | 'shot_made'
  | 'shot_missed'
  | 'three_made'
  | 'free_throw'
  | 'offensive_rebound'
  | 'defensive_rebound'
  | 'turnover'
  | 'foul'
  | 'timeout'
  | 'period_start'
  | 'period_end';

export interface GamePlayEvent {
  id: string;
  kind: 'play';
  playType: GamePlayType;
  timestamp: number;
  period: PredictGamePeriod | null;
  /** Game clock at the time of the play (e.g. "8:15" or "30.3"). */
  clock: string | null;
  teamSide: 'home' | 'away';
  teamAbbreviation: string;
  player?: {
    name: string;
    /** Shooting stat line, e.g. "6/15". */
    statLine?: string;
  };
  description: string;
  scoreAfter: { home: number; away: number };
  points?: number;
}

export interface GameFlashMarketOption {
  id: string;
  label: string;
  impliedPct: number;
}

/**
 * Short-lived micro-market woven into the feed ("Pick a player to score…").
 * Simulated for the POC — these are NOT real Polymarket markets and never
 * place real orders.
 */
export interface GameFlashMarketEvent {
  id: string;
  kind: 'flash';
  timestamp: number;
  question: string;
  options: GameFlashMarketOption[];
  /** Epoch ms after which the flash market is closed. */
  closesAt: number;
}

export type GameEvent = GamePlayEvent | GameFlashMarketEvent;

/**
 * Source of play-by-play events for a live game. The POC ships a simulated
 * implementation anchored to real score updates; a real play-by-play provider
 * can implement the same interface later without touching the UI.
 */
export interface GameEventSource {
  start(): void;
  stop(): void;
  /** Push a real anchor (score/period/clock) from the sports WebSocket. */
  syncAnchor(update: GameUpdate): void;
  subscribe(callback: (event: GameEvent) => void): () => void;
  /** Events emitted so far, oldest first (for late-mounting consumers). */
  getBacklog(): GameEvent[];
}
