import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PredictGameStatus, PredictMarket } from '../types';

const SPORTS_WS_URL = 'wss://sports-api.polymarket.com/ws';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface SportsWebSocketEvent {
  gameId: number;
  leagueAbbreviation: string;
  turn?: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  updatedAt: string;
  eventState: {
    gameId: number;
    type: string;
    score: string;
    elapsed: string;
    period: string;
    live: boolean;
    ended: boolean;
  };
  score: string;
  elapsed: string;
  period: string;
  live: boolean;
  ended: boolean;
}

type WebSocketReadyState = 0 | 1 | 2 | 3;

const WS_READY_STATE = {
  CONNECTING: 0 as WebSocketReadyState,
  OPEN: 1 as WebSocketReadyState,
  CLOSING: 2 as WebSocketReadyState,
  CLOSED: 3 as WebSocketReadyState,
};

const deriveGameStatus = (event: SportsWebSocketEvent): PredictGameStatus => {
  if (event.ended) {
    return 'ended';
  }
  if (event.live) {
    return 'ongoing';
  }
  return 'scheduled';
};

export interface UsePredictLiveMarketOptions {
  enabled?: boolean;
}

export interface UsePredictLiveMarketResult {
  liveMarket: PredictMarket | null;
  isConnected: boolean;
  lastUpdate: number | null;
}

export const usePredictLiveMarket = (
  market: PredictMarket | null,
  options: UsePredictLiveMarketOptions = {},
): UsePredictLiveMarketResult => {
  const { enabled = true } = options;

  const [liveMarket, setLiveMarket] = useState<PredictMarket | null>(market);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isMountedRef = useRef(true);

  const gameId = market?.game?.id;
  const shouldConnect = enabled && !!gameId && market?.game?.status !== 'ended';

  useEffect(() => {
    setLiveMarket(market);
  }, [market]);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      if (
        wsRef.current.readyState === WS_READY_STATE.OPEN ||
        wsRef.current.readyState === WS_READY_STATE.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, []);

  const handleMessage = useCallback(
    (event: WebSocketMessageEvent) => {
      if (!isMountedRef.current || !gameId) return;

      try {
        const data: SportsWebSocketEvent = JSON.parse(event.data);
        // console.warn('[usePredictLiveMarket] Received update for game:', {
        //   gameId: data.gameId,
        //   score: data.score,
        //   period: data.period,
        //   elapsed: data.elapsed,
        //   live: data.live,
        //   ended: data.ended,
        // });

        if (String(data.gameId) !== String(gameId)) {
          return;
        }

        console.warn('[usePredictLiveMarket] Received update for game:', {
          gameId: data.gameId,
          score: data.score,
          period: data.period,
          elapsed: data.elapsed,
          live: data.live,
          ended: data.ended,
          turn: data.turn,
        });

        setLiveMarket((prevMarket) => {
          if (!prevMarket?.game) return prevMarket;

          return {
            ...prevMarket,
            game: {
              ...prevMarket.game,
              score: data.score,
              elapsed: data.elapsed,
              period: data.period,
              status: deriveGameStatus(data),
              turn: data.turn,
            },
          };
        });

        setLastUpdate(Date.now());
      } catch (err) {
        console.warn('[usePredictLiveMarket] Failed to parse message:', err);
      }
    },
    [gameId],
  );

  const connect = useCallback(() => {
    if (!shouldConnect || !isMountedRef.current) return;

    if (
      wsRef.current?.readyState === WS_READY_STATE.OPEN ||
      wsRef.current?.readyState === WS_READY_STATE.CONNECTING
    ) {
      return;
    }

    cleanup();

    console.warn('[usePredictLiveMarket] Connecting to:', SPORTS_WS_URL);

    try {
      const ws = new WebSocket(SPORTS_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        console.warn('[usePredictLiveMarket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        console.warn('[usePredictLiveMarket] Disconnected');
        setIsConnected(false);

        if (
          shouldConnect &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;
          console.warn(
            `[usePredictLiveMarket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`,
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && shouldConnect) {
              connect();
            }
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.warn('[usePredictLiveMarket] WebSocket error:', error);
      };

      ws.onmessage = handleMessage;
    } catch (err) {
      console.warn('[usePredictLiveMarket] Failed to create WebSocket:', err);
    }
  }, [shouldConnect, cleanup, handleMessage]);

  useEffect(() => {
    isMountedRef.current = true;

    if (shouldConnect) {
      connect();
    } else {
      cleanup();
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [shouldConnect, connect, cleanup]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!isMountedRef.current) return;

      if (nextAppState === 'active' && shouldConnect) {
        console.warn('[usePredictLiveMarket] App became active, reconnecting');
        reconnectAttemptsRef.current = 0;
        connect();
      } else if (nextAppState === 'background') {
        console.warn(
          '[usePredictLiveMarket] App went to background, disconnecting',
        );
        cleanup();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [shouldConnect, connect, cleanup]);

  return {
    liveMarket,
    isConnected,
    lastUpdate,
  };
};
