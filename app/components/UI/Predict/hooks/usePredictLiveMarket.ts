import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PredictGameStatus, PredictMarket } from '../types';

const SPORTS_WS_URL = 'wss://sports-api.polymarket.com/ws';
const MARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
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

interface PriceChange {
  asset_id: string;
  price: string;
  size: string;
  side: string;
  hash: string;
  best_bid: string;
  best_ask: string;
}

interface MarketWebSocketEvent {
  event_type: string;
  market: string;
  price_changes?: PriceChange[];
  timestamp: string;
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

const parseAskPrice = (bestAsk: string): number => parseFloat(bestAsk) || 0;

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

  const sportsWsRef = useRef<WebSocket | null>(null);
  const marketWsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const marketReconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const marketReconnectTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isMountedRef = useRef(true);

  const gameId = market?.game?.id;
  const tokenIds = market?.outcomes?.[0]?.tokens?.map((t) => t.id) ?? [];
  const shouldConnectSports =
    enabled && !!gameId && market?.game?.status !== 'ended';
  const shouldConnectMarket = enabled && tokenIds.length > 0;

  useEffect(() => {
    setLiveMarket(market);
  }, [market]);

  const cleanupSportsWs = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (sportsWsRef.current) {
      sportsWsRef.current.onopen = null;
      sportsWsRef.current.onclose = null;
      sportsWsRef.current.onerror = null;
      sportsWsRef.current.onmessage = null;
      if (
        sportsWsRef.current.readyState === WS_READY_STATE.OPEN ||
        sportsWsRef.current.readyState === WS_READY_STATE.CONNECTING
      ) {
        sportsWsRef.current.close();
      }
      sportsWsRef.current = null;
    }
  }, []);

  const cleanupMarketWs = useCallback(() => {
    if (marketReconnectTimeoutRef.current) {
      clearTimeout(marketReconnectTimeoutRef.current);
      marketReconnectTimeoutRef.current = null;
    }
    if (marketWsRef.current) {
      marketWsRef.current.onopen = null;
      marketWsRef.current.onclose = null;
      marketWsRef.current.onerror = null;
      marketWsRef.current.onmessage = null;
      if (
        marketWsRef.current.readyState === WS_READY_STATE.OPEN ||
        marketWsRef.current.readyState === WS_READY_STATE.CONNECTING
      ) {
        marketWsRef.current.close();
      }
      marketWsRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    cleanupSportsWs();
    cleanupMarketWs();
    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, [cleanupSportsWs, cleanupMarketWs]);

  const handleSportsMessage = useCallback(
    (event: WebSocketMessageEvent) => {
      if (!isMountedRef.current || !gameId) return;

      try {
        const data: SportsWebSocketEvent = JSON.parse(event.data);

        if (String(data.gameId) !== String(gameId)) {
          return;
        }

        console.warn('[usePredictLiveMarket] Sports update:', {
          gameId: data.gameId,
          score: data.score,
          period: data.period,
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
        console.warn('[usePredictLiveMarket] Failed to parse sports message');
      }
    },
    [gameId],
  );

  const handleMarketMessage = useCallback(
    (event: WebSocketMessageEvent) => {
      if (!isMountedRef.current || tokenIds.length === 0) return;

      try {
        const data: MarketWebSocketEvent = JSON.parse(event.data);

        if (data.event_type !== 'price_change' || !data.price_changes) {
          return;
        }

        const tokenIdSet = new Set(tokenIds);
        const relevantChanges = data.price_changes.filter((change) =>
          tokenIdSet.has(change.asset_id),
        );

        if (relevantChanges.length === 0) {
          return;
        }

        console.warn('[usePredictLiveMarket] Price update:', {
          changes: relevantChanges.map((c) => ({
            asset_id: c.asset_id.slice(-8),
            best_bid: c.best_bid,
            best_ask: c.best_ask,
          })),
        });

        setLiveMarket((prevMarket) => {
          if (!prevMarket?.outcomes) return prevMarket;

          const updatedOutcomes = prevMarket.outcomes.map((outcome) => ({
            ...outcome,
            tokens: outcome.tokens.map((token) => {
              const priceChange = relevantChanges.find(
                (c) => c.asset_id === token.id,
              );
              if (priceChange) {
                const newPrice = parseAskPrice(priceChange.best_ask);
                return { ...token, price: newPrice };
              }
              return token;
            }),
          }));

          return {
            ...prevMarket,
            outcomes: updatedOutcomes,
          };
        });

        setLastUpdate(Date.now());
      } catch (err) {
        console.warn('[usePredictLiveMarket] Failed to parse market message');
      }
    },
    [tokenIds],
  );

  const connectSportsWs = useCallback(() => {
    if (!shouldConnectSports || !isMountedRef.current) return;

    if (
      sportsWsRef.current?.readyState === WS_READY_STATE.OPEN ||
      sportsWsRef.current?.readyState === WS_READY_STATE.CONNECTING
    ) {
      return;
    }

    cleanupSportsWs();

    console.warn('[usePredictLiveMarket] Connecting to sports WS');

    try {
      const ws = new WebSocket(SPORTS_WS_URL);
      sportsWsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        console.warn('[usePredictLiveMarket] Sports WS connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        console.warn('[usePredictLiveMarket] Sports WS disconnected');

        if (
          shouldConnectSports &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && shouldConnectSports) {
              connectSportsWs();
            }
          }, delay);
        }
      };

      ws.onerror = () => {
        console.warn('[usePredictLiveMarket] Sports WS error');
      };

      ws.onmessage = handleSportsMessage;
    } catch (err) {
      console.warn('[usePredictLiveMarket] Failed to create sports WS');
    }
  }, [shouldConnectSports, cleanupSportsWs, handleSportsMessage]);

  const connectMarketWs = useCallback(() => {
    if (!shouldConnectMarket || !isMountedRef.current) return;

    if (
      marketWsRef.current?.readyState === WS_READY_STATE.OPEN ||
      marketWsRef.current?.readyState === WS_READY_STATE.CONNECTING
    ) {
      return;
    }

    cleanupMarketWs();

    console.warn('[usePredictLiveMarket] Connecting to market WS');

    try {
      const ws = new WebSocket(MARKET_WS_URL);
      marketWsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        console.warn('[usePredictLiveMarket] Market WS connected');

        const subscriptionMessage = JSON.stringify({
          assets_ids: tokenIds,
          type: 'market',
        });
        ws.send(subscriptionMessage);
        console.warn(
          '[usePredictLiveMarket] Subscribed to tokens:',
          tokenIds.map((id) => id.slice(-8)),
        );

        marketReconnectAttemptsRef.current = 0;
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        console.warn('[usePredictLiveMarket] Market WS disconnected');

        if (
          shouldConnectMarket &&
          marketReconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          marketReconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY_MS * marketReconnectAttemptsRef.current;
          marketReconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && shouldConnectMarket) {
              connectMarketWs();
            }
          }, delay);
        }
      };

      ws.onerror = () => {
        console.warn('[usePredictLiveMarket] Market WS error');
      };

      ws.onmessage = handleMarketMessage;
    } catch (err) {
      console.warn('[usePredictLiveMarket] Failed to create market WS');
    }
  }, [shouldConnectMarket, cleanupMarketWs, handleMarketMessage, tokenIds]);

  useEffect(() => {
    isMountedRef.current = true;

    if (shouldConnectSports) {
      connectSportsWs();
    } else {
      cleanupSportsWs();
    }

    return () => {
      cleanupSportsWs();
    };
  }, [shouldConnectSports, connectSportsWs, cleanupSportsWs]);

  useEffect(() => {
    if (shouldConnectMarket) {
      connectMarketWs();
    } else {
      cleanupMarketWs();
    }

    return () => {
      cleanupMarketWs();
    };
  }, [shouldConnectMarket, connectMarketWs, cleanupMarketWs]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!isMountedRef.current) return;

      if (nextAppState === 'active') {
        console.warn('[usePredictLiveMarket] App active, reconnecting');
        reconnectAttemptsRef.current = 0;
        marketReconnectAttemptsRef.current = 0;
        if (shouldConnectSports) connectSportsWs();
        if (shouldConnectMarket) connectMarketWs();
      } else if (nextAppState === 'background') {
        console.warn('[usePredictLiveMarket] App background, disconnecting');
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
  }, [
    shouldConnectSports,
    shouldConnectMarket,
    connectSportsWs,
    connectMarketWs,
    cleanup,
  ]);

  return {
    liveMarket,
    isConnected,
    lastUpdate,
  };
};
