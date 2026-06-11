import { useEffect, useRef, useState } from 'react';
import {
  appendEvent,
  SimulatedGameEventSource,
  type GameLiveFeedItem,
  type GameLiveMarkets,
} from '../../../services/gameEvents';
import type { GameUpdate, PredictMarketGame } from '../../../types';

export interface UseGameEventFeedParams {
  game: PredictMarketGame | undefined;
  /** Latest real anchor from the sports WebSocket (or a scripted mock). */
  gameUpdate: GameUpdate | null;
  /** Real markets to interleave as inline widgets. */
  markets: GameLiveMarkets;
  enabled?: boolean;
}

export interface UseGameEventFeedResult {
  feedItems: GameLiveFeedItem[];
}

/**
 * Owns the play-by-play event source for the Game Live screen. Spins up a
 * simulator per game, anchors it to real score/period updates, and folds
 * emitted events into a newest-first feed via the pure composer.
 */
export const useGameEventFeed = ({
  game,
  gameUpdate,
  markets,
  enabled = true,
}: UseGameEventFeedParams): UseGameEventFeedResult => {
  const [feedItems, setFeedItems] = useState<GameLiveFeedItem[]>([]);
  const sourceRef = useRef<SimulatedGameEventSource | null>(null);

  // Refs so the long-lived subscription always sees the latest values without
  // tearing the source down on every market refetch.
  const gameRef = useRef(game);
  const marketsRef = useRef(markets);
  useEffect(() => {
    gameRef.current = game;
    marketsRef.current = markets;
  }, [game, markets]);

  const gameId = game?.id ?? null;

  useEffect(() => {
    const currentGame = gameRef.current;
    if (!enabled || !gameId || !currentGame) {
      return;
    }

    const source = new SimulatedGameEventSource({ game: currentGame });
    sourceRef.current = source;

    const unsubscribe = source.subscribe((event) => {
      setFeedItems((previous) =>
        appendEvent(previous, event, marketsRef.current),
      );
    });
    source.start();

    return () => {
      unsubscribe();
      source.stop();
      sourceRef.current = null;
      setFeedItems([]);
    };
  }, [gameId, enabled]);

  useEffect(() => {
    if (gameUpdate && sourceRef.current) {
      sourceRef.current.syncAnchor(gameUpdate);
    }
  }, [gameUpdate]);

  return { feedItems };
};
