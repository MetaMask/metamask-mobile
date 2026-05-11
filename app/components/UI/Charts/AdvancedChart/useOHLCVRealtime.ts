// TODO: Remove all console.log statements before merging to production.
/* eslint-disable no-console */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OHLCVBar as WSOHLCVBar } from '@metamask/core-backend';
import Engine from '../../../../core/Engine';

export interface UseOHLCVRealtimeOptions {
  /** CAIP-19 asset identifier */
  assetId: string;
  /** Candle interval for WS subscription (e.g. "1m", "5m", "1h", "1d") */
  interval: string;
  /** Fiat currency code (e.g. "usd") */
  currency: string;
  /** Time period for /latest REST fallback (e.g. "1h", "1d", "1w") — lowercase */
  timePeriod: string;
  /** When false, skips subscription (e.g. legacy chart fallback) */
  enabled: boolean;
}

export interface UseOHLCVRealtimeResult {
  /** Latest bar from WebSocket stream or HTTP fallback (timestamp in seconds) */
  latestBar: WSOHLCVBar | null;
}

const DEBOUNCE_MS = 500;

// TODO: Remove before merging to production.
// DEV-ONLY: Auto-simulate a WebSocket disconnect/reconnect after this many ms (0 = disabled).
const DEV_SIMULATE_WS_DISCONNECT_AFTER_MS = 0;

/** How often we check whether data is stale (ms) */
const STALENESS_CHECK_INTERVAL_MS = 15_000;

/** If no WS message arrives within this window, consider the stream stale */
const STALENESS_THRESHOLD_MS = 30_000;

const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv';

/**
 * Fetch the current (latest) candle from the dedicated /latest REST endpoint.
 * The API returns a single bar object with `timestamp` in milliseconds.
 */
async function fetchLatestBar(
  assetId: string,
  timePeriod: string,
  wsInterval: string,
  currency: string,
  signal?: AbortSignal,
): Promise<WSOHLCVBar | null> {
  const url = new URL(`${OHLCV_BASE_URL}/${assetId}/latest`);
  url.searchParams.set('timePeriod', timePeriod);
  url.searchParams.set('interval', wsInterval);
  url.searchParams.set('vsCurrency', currency);

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) return null;

  const bar = (await response.json()) as {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null;

  if (!bar) return null;

  return {
    timestamp: bar.timestamp / 1000,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * Extract the chain portion from a CAIP-19 asset ID.
 * e.g. "eip155:8453/erc20:0x..." → "eip155:8453"
 */
function extractChainId(assetId: string): string {
  const slashIdx = assetId.indexOf('/');
  return slashIdx > 0 ? assetId.slice(0, slashIdx) : assetId;
}

/**
 * Subscribes to real-time OHLCV candle updates via OHLCVService (WebSocket).
 * Uses a 300ms debounce before subscribing to avoid thrashing during rapid
 * time-range or asset navigation changes.
 *
 * Includes a staleness-based HTTP polling fallback:
 * - Tracks `lastMessageTime` on every WS bar received.
 * - Every 15 seconds checks if no WS message arrived within the last 30 seconds.
 * - Also listens to `OHLCVService:chainStatusChanged` for chain-down events.
 * - When stale or chain-down, fetches the latest candle via the REST API.
 *
 * Note: Both WebSocket disconnect and server-side chain-down notifications
 * publish the same `OHLCVService:chainStatusChanged` event with
 * `status: 'down'`. The hook handles both identically — on the next staleness
 * check interval (up to 15s delay) it triggers a REST poll. For immediate
 * polling on disconnect/chain-down, call `pollLatest()` directly inside
 * `handleChainStatusChanged` when status transitions to 'down'.
 */
export function useOHLCVRealtime({
  assetId,
  interval,
  currency,
  timePeriod,
  enabled,
}: UseOHLCVRealtimeOptions): UseOHLCVRealtimeResult {
  const [latestBar, setLatestBar] = useState<WSOHLCVBar | null>(null);
  const subscribedRef = useRef(false);
  const cancelledRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<string>('');

  // Staleness tracking
  const lastMessageTimeRef = useRef<number>(0);
  const stalenessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chainDownRef = useRef(false);
  const pollingAbortRef = useRef<AbortController | null>(null);

  const buildChannel = useCallback(
    () => `market-data.v1.${assetId}.${interval}.${currency}`,
    [assetId, interval, currency],
  );

  useEffect(() => {
    if (!enabled || !assetId || !interval || !currency) {
      return;
    }

    const channel = buildChannel();
    channelRef.current = channel;
    cancelledRef.current = false;
    setLatestBar(null);
    lastMessageTimeRef.current = 0;
    chainDownRef.current = false;

    const handleBarUpdated = (payload: {
      channel: string;
      bar: WSOHLCVBar;
    }) => {
      if (payload.channel === channelRef.current) {
        console.log(
          `[OHLCV-WS] Bar received — channel=${payload.channel}, close=${payload.bar.close}, ts=${payload.bar.timestamp}`,
        );
        lastMessageTimeRef.current = Date.now();
        chainDownRef.current = false;
        setLatestBar(payload.bar);
      }
    };

    const handleSubscriptionError = (payload: {
      channel: string;
      error: string;
      operation: string;
    }) => {
      console.log(
        `[OHLCV-WS] Subscription error on ${payload.channel}: ${payload.error} (${payload.operation})`,
      );
    };

    const chainId = extractChainId(assetId);
    const handleChainStatusChanged = (payload: {
      chainIds: string[];
      status: 'up' | 'down';
      timestamp?: number;
    }) => {
      if (payload.chainIds.includes(chainId)) {
        console.log(
          `[OHLCV-WS] Chain status changed — chainId=${chainId}, status=${payload.status}`,
        );
        chainDownRef.current = payload.status === 'down';
      }
    };

    // Subscribe to messenger events before triggering the WS subscription
    (Engine.controllerMessenger.subscribe as (...args: unknown[]) => void)(
      'OHLCVService:barUpdated',
      handleBarUpdated,
    );
    (Engine.controllerMessenger.subscribe as (...args: unknown[]) => void)(
      'OHLCVService:subscriptionError',
      handleSubscriptionError,
    );
    (Engine.controllerMessenger.subscribe as (...args: unknown[]) => void)(
      'OHLCVService:chainStatusChanged',
      handleChainStatusChanged,
    );

    // Staleness polling: check periodically if we should fall back to REST
    const pollLatest = async () => {
      pollingAbortRef.current?.abort();
      const controller = new AbortController();
      pollingAbortRef.current = controller;

      console.log('[OHLCV-WS] Polling /latest via REST fallback');
      try {
        const bar = await fetchLatestBar(
          assetId,
          timePeriod,
          interval,
          currency,
          controller.signal,
        );
        if (bar) {
          lastMessageTimeRef.current = Date.now();
          setLatestBar(bar);
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.log(
            `[OHLCV-WS] REST fallback error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    };

    stalenessTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastMessageTimeRef.current;
      const isStale =
        lastMessageTimeRef.current > 0 && elapsed > STALENESS_THRESHOLD_MS;

      if (isStale || chainDownRef.current) {
        console.log(
          `[OHLCV-WS] Stream stale or chain down — isStale=${isStale}, chainDown=${chainDownRef.current}, elapsed=${elapsed}ms`,
        );
        pollLatest();
      }
    }, STALENESS_CHECK_INTERVAL_MS);

    // Debounce the actual WS subscribe call
    debounceTimerRef.current = setTimeout(async () => {
      console.log(
        `[OHLCV-WS] Debounce fired — calling OHLCVService:subscribe for ${channel}`,
      );
      try {
        await Engine.controllerMessenger.call('OHLCVService:subscribe', {
          assetId,
          interval,
          currency,
        });

        if (cancelledRef.current) {
          console.log(
            `[OHLCV-WS] Subscribe completed but effect was cancelled — undoing subscribe for ${channel}`,
          );
          await Engine.controllerMessenger.call('OHLCVService:unsubscribe', {
            assetId,
            interval,
            currency,
          });
          return;
        }

        subscribedRef.current = true;
        lastMessageTimeRef.current = Date.now();
      } catch (err) {
        console.log(
          `[OHLCV-WS] Failed to subscribe: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }, DEBOUNCE_MS);

    // TODO: Remove before merging to production.
    // DEV-ONLY: simulate a WebSocket disconnect/reconnect after N ms.
    // Set DEV_SIMULATE_WS_DISCONNECT_AFTER_MS to e.g. 10000 (10s) to activate.
    let devDisconnectTimer: ReturnType<typeof setTimeout> | null = null;
    if (__DEV__ && DEV_SIMULATE_WS_DISCONNECT_AFTER_MS > 0) {
      devDisconnectTimer = setTimeout(() => {
        console.log(
          `[OHLCV-WS] DEV: Simulating WS disconnect (no reconnect) after ${DEV_SIMULATE_WS_DISCONNECT_AFTER_MS}ms`,
        );
        Engine.controllerMessenger.call(
          'BackendWebSocketService:disconnect' as never,
        );
      }, DEV_SIMULATE_WS_DISCONNECT_AFTER_MS);
    }

    return () => {
      console.log(
        `[OHLCV-WS] Cleanup — channel=${channel}, wasSubscribed=${subscribedRef.current}`,
      );

      cancelledRef.current = true;

      if (devDisconnectTimer) {
        clearTimeout(devDisconnectTimer);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (stalenessTimerRef.current) {
        clearInterval(stalenessTimerRef.current);
        stalenessTimerRef.current = null;
      }

      pollingAbortRef.current?.abort();

      (Engine.controllerMessenger.unsubscribe as (...args: unknown[]) => void)(
        'OHLCVService:barUpdated',
        handleBarUpdated,
      );
      (Engine.controllerMessenger.unsubscribe as (...args: unknown[]) => void)(
        'OHLCVService:subscriptionError',
        handleSubscriptionError,
      );
      (Engine.controllerMessenger.unsubscribe as (...args: unknown[]) => void)(
        'OHLCVService:chainStatusChanged',
        handleChainStatusChanged,
      );

      Engine.controllerMessenger
        .call('OHLCVService:unsubscribe', { assetId, interval, currency })
        .catch((err: unknown) => {
          console.log(
            `[OHLCV-WS] Failed to unsubscribe: ${err instanceof Error ? (err as Error).message : String(err)}`,
          );
        });
      subscribedRef.current = false;
    };
  }, [assetId, interval, currency, timePeriod, enabled, buildChannel]);

  return { latestBar };
}
