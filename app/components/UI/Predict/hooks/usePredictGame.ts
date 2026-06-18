import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { predictQueries } from '../queries';
import type { GameUpdate, PredictMarketGame } from '../types';
import { parseScore } from '../utils/gameParser';
import { isGameEnded } from '../utils/scoreboard';

export interface UsePredictGameResult {
  game: PredictMarketGame | null;
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
  game: PredictMarketGame | null | undefined,
): UsePredictGameResult => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(() =>
    game?.id ? (liveGameUpdateTimes.get(game.id) ?? null) : null,
  );
  const isMountedRef = useRef(true);
  const gameRef = useRef<PredictMarketGame | null>(game ?? null);
  const gameId = game?.id ?? '';

  const queryKey = useMemo(
    () => predictQueries.game.keys.detail(gameId),
    [gameId],
  );

  const query = useQuery<PredictMarketGame | null>({
    queryKey,
    queryFn: async () => game ?? null,
    enabled: Boolean(game),
    initialData: () =>
      game
        ? mergeCachedGame(
            game,
            queryClient.getQueryData<PredictMarketGame>(queryKey),
          )
        : null,
    staleTime: Infinity,
  });

  useEffect(() => {
    gameRef.current = game ?? null;

    if (!game) {
      setLastUpdateTime(null);
      return;
    }

    const key = predictQueries.game.keys.detail(game.id);
    queryClient.setQueryData<PredictMarketGame>(key, (cachedGame) =>
      mergeCachedGame(game, cachedGame),
    );
    setLastUpdateTime(liveGameUpdateTimes.get(game.id) ?? null);
  }, [game, queryClient]);

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

    if (!gameId) {
      setIsConnected(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToGameUpdates(
      gameId,
      handleGameUpdate,
    );

    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = PredictController.getConnectionStatus();
      setIsConnected(status.sportsConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [gameId, handleGameUpdate]);

  return {
    game: query.data ?? game ?? null,
    isConnected,
    lastUpdateTime,
  };
};
