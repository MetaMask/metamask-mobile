import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { predictQueries } from '../queries';
import type { GameUpdate, PredictMarket, PredictMarketGame } from '../types';
import { parseScore } from '../utils/gameParser';
import { isGameEnded } from '../utils/scoreboard';

export interface UsePredictGameOptions {
  live?: boolean;
}

export interface UsePredictGameResult {
  game: PredictMarket['game'];
  isConnected: boolean;
  lastUpdateTime: number | null;
}

const liveGameUpdateTimes = new Map<string, number>();

export const __resetPredictGameCacheForTest = () => {
  liveGameUpdateTimes.clear();
};

const getGameEnded = (game: PredictMarketGame): boolean =>
  isGameEnded({
    status: game.status,
    period: game.period,
    endTime: game.endTime,
  });

const mergeCachedGame = (
  incomingGame: PredictMarketGame,
  cachedGame: PredictMarketGame | undefined,
): PredictMarketGame => {
  if (!cachedGame || cachedGame.id !== incomingGame.id) {
    return incomingGame;
  }

  // Once the provider stamps a terminal REST state, prefer it over an older
  // live cache entry so the scoreboard does not remain in-progress.
  if (getGameEnded(incomingGame)) {
    return incomingGame;
  }

  if (!liveGameUpdateTimes.has(incomingGame.id)) {
    return incomingGame;
  }

  return {
    ...incomingGame,
    score: cachedGame.score,
    elapsed: cachedGame.elapsed,
    period: cachedGame.period,
    status: cachedGame.status,
    turn: cachedGame.turn,
  };
};

const mergeGameUpdate = (
  game: PredictMarketGame,
  update: GameUpdate,
): PredictMarketGame => ({
  ...game,
  score: update.score ? parseScore(update.score, game.league) : null,
  elapsed: update.elapsed || null,
  period: update.period || null,
  status: update.status,
  turn: update.turn,
});

export const usePredictGame = (
  market: PredictMarket | null | undefined,
  { live = false }: UsePredictGameOptions = {},
): UsePredictGameResult => {
  const queryClient = useQueryClient();
  const initialGame = market?.game;
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(() =>
    initialGame?.id ? (liveGameUpdateTimes.get(initialGame.id) ?? null) : null,
  );
  const isMountedRef = useRef(true);
  const gameRef = useRef<PredictMarketGame | undefined>(initialGame);
  const gameId = initialGame?.id ?? '';

  const queryKey = useMemo(
    () => predictQueries.game.keys.detail(gameId),
    [gameId],
  );

  const query = useQuery<PredictMarketGame | null>({
    queryKey,
    queryFn: async () => {
      if (!initialGame) {
        return null;
      }

      return mergeCachedGame(
        initialGame,
        queryClient.getQueryData<PredictMarketGame>(queryKey),
      );
    },
    enabled: Boolean(initialGame),
    initialData: initialGame,
    staleTime: Infinity,
  });

  useEffect(() => {
    gameRef.current = initialGame;

    if (!initialGame) {
      setLastUpdateTime(null);
      return;
    }

    const key = predictQueries.game.keys.detail(initialGame.id);
    queryClient.setQueryData<PredictMarketGame>(key, (cachedGame) =>
      mergeCachedGame(initialGame, cachedGame),
    );
    setLastUpdateTime(liveGameUpdateTimes.get(initialGame.id) ?? null);
  }, [initialGame, queryClient]);

  const handleGameUpdate = useCallback(
    (update: GameUpdate) => {
      if (!isMountedRef.current) return;

      const key = predictQueries.game.keys.detail(update.gameId);
      const baseGame =
        queryClient.getQueryData<PredictMarketGame>(key) ?? gameRef.current;

      if (!baseGame || baseGame.id !== update.gameId) {
        return;
      }

      const updatedAt = Date.now();
      liveGameUpdateTimes.set(update.gameId, updatedAt);
      queryClient.setQueryData<PredictMarketGame>(
        key,
        mergeGameUpdate(baseGame, update),
      );
      setLastUpdateTime(updatedAt);
    },
    [queryClient],
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!live || !gameId) {
      setIsConnected(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToGameUpdates(
      gameId,
      handleGameUpdate,
    );

    const unsubscribeStatus = PredictController.subscribeToConnectionStatus(
      (status) => {
        if (!isMountedRef.current) return;
        setIsConnected(status.sportsConnected);
      },
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      unsubscribeStatus();
    };
  }, [gameId, handleGameUpdate, live]);

  return {
    game: query.data ?? undefined,
    isConnected,
    lastUpdateTime,
  };
};
