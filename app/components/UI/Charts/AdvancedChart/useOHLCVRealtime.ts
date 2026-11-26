import { useCallback, useEffect, useRef, useState } from 'react';
import type { OHLCVBar as WSOHLCVBar } from '@metamask/core-backend';
import Engine from '../../../../core/Engine';
import { resolvePollInterval } from '../../../../core/Networking/policy';
import { useNetworkQuery } from '../../../../core/Networking/useNetworkQuery';
import { usePriceApiHost } from '../../TokenDetails/context/PriceApiHostContext';

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
  /** Price API origin for the `/latest` fallback. Omitted means prod. */
  baseUrl?: string;
}

export interface UseOHLCVRealtimeResult {
  /** Latest bar from WebSocket stream or HTTP fallback (timestamp in seconds) */
  latestBar: WSOHLCVBar | null;
  /**
   * True while the current asset has no bar yet and its first `/latest` poll
   * has not answered. A `null` bar with `isLoading` false means no price is
   * available for the asset.
   */
  isLoading: boolean;
}

const DEBOUNCE_MS = 500;

/** How often we poll /latest when stale (matches WS heartbeat interval) */
const STALENESS_CHECK_INTERVAL_MS = 5_000;

/** If no WS message arrives within this window, consider the stream stale */
const STALENESS_THRESHOLD_MS = 5_000;

const OHLCV_PATH = '/v3/ohlcv';

/**
 * Fetch the current (latest) candle from the dedicated /latest REST endpoint.
 * The API returns a single bar object with `timestamp` in milliseconds.
 */
function parseLatestBar(body: unknown): WSOHLCVBar | null {
  if (!body || typeof body !== 'object') return null;
  const bar: Record<string, unknown> = { ...body };
  const { timestamp, open, high, low, close, volume } = bar;
  if (!isFiniteNumber(timestamp) || !isFiniteNumber(open)) return null;
  if (!isFiniteNumber(high) || !isFiniteNumber(low)) return null;
  if (!isFiniteNumber(close) || !isFiniteNumber(volume)) return null;
  return { timestamp: timestamp / 1000, open, high, low, close, volume };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Extract the chain portion from a CAIP-19 asset ID.
 * e.g. "eip155:8453/erc20:0x..." → "eip155:8453"
 */
function extractChainId(assetId: string): string {
  const slashIdx = assetId.indexOf('/');
  return slashIdx > 0 ? assetId.slice(0, slashIdx) : assetId;
}

/** Field-by-field equality check to avoid re-rendering on identical bars. */
function areBarsEqual(a: WSOHLCVBar | null, b: WSOHLCVBar | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.timestamp === b.timestamp &&
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    a.volume === b.volume
  );
}

/**
 * Subscribes to real-time OHLCV candle updates via OHLCVService (WebSocket).
 * Uses a 500ms debounce before subscribing to avoid thrashing during rapid
 * time-range or asset navigation changes.
 *
 * Includes a staleness-based HTTP polling fallback:
 * - Tracks `lastMessageTime` on every WS bar received.
 * - Every 5 seconds checks if no WS message arrived within the last 5 seconds.
 * - On subscribe error or chain-down, immediately polls `/latest` (no wait).
 * - When stale, continues polling `/latest` every 5s (matching WS heartbeat).
 */
export function useOHLCVRealtime({
  assetId,
  interval,
  currency,
  timePeriod,
  enabled,
  baseUrl,
}: UseOHLCVRealtimeOptions): UseOHLCVRealtimeResult {
  // Outside a `PriceApiHostProvider` this is prod, which keeps Bridge's live
  // rate and the legacy chart on the host they already use. The WebSocket
  // itself is unaffected either way — its gateway comes from the build.
  const contextBaseUrl = usePriceApiHost();
  const latestBaseUrl = baseUrl ?? contextBaseUrl;
  const params = new URLSearchParams({
    timePeriod,
    interval,
    vsCurrency: currency,
  });
  const latestUrl = `${latestBaseUrl}${OHLCV_PATH}/${assetId}/latest?${params.toString()}`;
  // Only the WebSocket fallback triggers this query, not mount/focus or a second timer.
  const { refetch: refetchLatestBar, isPaused: isLatestBarPaused } =
    useNetworkQuery({
      queryKey: ['ohlcv-latest', latestUrl],
      url: latestUrl,
      parse: parseLatestBar,
      enabled: false,
    });

  const [latest, setLatest] = useState<{
    channel: string;
    bar: WSOHLCVBar;
  } | null>(null);
  // Channel whose first price lookup has answered, with or without a bar.
  const [settledChannel, setSettledChannel] = useState<string | null>(null);
  // Skips the state update (and re-render) when the bar hasn't changed.
  const updateLatestBar = useCallback((channel: string, bar: WSOHLCVBar) => {
    setLatest((prev) =>
      prev?.channel === channel && areBarsEqual(prev.bar, bar)
        ? prev
        : { channel, bar },
    );
  }, []);
  const subscribedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<string>('');

  // Staleness tracking
  const lastMessageTimeRef = useRef<number>(0);
  const stalenessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chainDownRef = useRef(false);

  const buildChannel = useCallback(
    () => `ohlcv.v1.${assetId}.${interval}.${currency}`,
    [assetId, interval, currency],
  );

  useEffect(() => {
    if (!enabled || !assetId || !interval || !currency) {
      return;
    }

    const channel = buildChannel();
    channelRef.current = channel;
    setLatest(null);
    setSettledChannel(null);
    lastMessageTimeRef.current = 0;
    chainDownRef.current = false;

    let active = true;
    let pollInFlight = false;
    let lastPollAt = 0;
    let wsRevision = 0;

    const pollLatest = async () => {
      if (!active || pollInFlight) return;
      pollInFlight = true;
      lastPollAt = Date.now();
      const revision = wsRevision;
      const result = await refetchLatestBar({ cancelRefetch: false });
      pollInFlight = false;
      if (!active) return;
      if (result.isSuccess && result.data && revision === wsRevision) {
        lastMessageTimeRef.current = Date.now();
        updateLatestBar(channel, result.data);
      }
      setSettledChannel(channel);
    };

    const handleBarUpdated = (payload: {
      channel: string;
      bar: WSOHLCVBar;
    }) => {
      if (payload.channel === channelRef.current) {
        wsRevision += 1;
        lastMessageTimeRef.current = Date.now();
        chainDownRef.current = false;
        updateLatestBar(payload.channel, payload.bar);
      }
    };

    const handleSubscriptionError = (payload: {
      channel: string;
      error: string;
      operation: string;
    }) => {
      if (
        payload.operation === 'subscribe' &&
        payload.channel === channelRef.current
      ) {
        lastMessageTimeRef.current = 1;
        pollLatest();
      }
    };

    const chainId = extractChainId(assetId);
    const handleChainStatusChanged = (payload: {
      chainIds: string[];
      status: 'up' | 'down';
      timestamp?: number;
    }) => {
      if (payload.chainIds.includes(chainId)) {
        chainDownRef.current = payload.status === 'down';
        if (payload.status === 'down') {
          pollLatest();
        }
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

    stalenessTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastMessageTimeRef.current;
      const isStale =
        lastMessageTimeRef.current > 0 && elapsed >= STALENESS_THRESHOLD_MS;

      const intervalMs = resolvePollInterval(STALENESS_CHECK_INTERVAL_MS);
      if (!intervalMs) return;
      // At normal speed the original 5 s staleness check already gates each poll.
      if (intervalMs > STALENESS_CHECK_INTERVAL_MS) {
        if (Date.now() - lastPollAt < intervalMs) return;
      }
      if (isStale || chainDownRef.current) {
        pollLatest();
      }
    }, STALENESS_CHECK_INTERVAL_MS);

    // Debounce the actual WS subscribe call
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await Engine.controllerMessenger.call('OHLCVService:subscribe', {
          assetId,
          interval,
          currency,
        });

        if (!active) {
          await Engine.controllerMessenger.call('OHLCVService:unsubscribe', {
            assetId,
            interval,
            currency,
          });
          return;
        }

        subscribedRef.current = true;
        lastMessageTimeRef.current = Date.now();

        // Immediate poll for instant data, then staleness check handles rest
        pollLatest();
      } catch {
        // Subscribe failure is handled via subscriptionError event → immediate REST poll.
        // Without that event no poll follows, so the lookup is over.
        if (active && !pollInFlight) {
          setSettledChannel(channel);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      active = false;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (stalenessTimerRef.current) {
        clearInterval(stalenessTimerRef.current);
        stalenessTimerRef.current = null;
      }

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
        .catch(() => {
          // Non-fatal: grace period in core will handle cleanup.
        });
      subscribedRef.current = false;
    };
  }, [
    assetId,
    interval,
    currency,
    timePeriod,
    enabled,
    latestUrl,
    refetchLatestBar,
    buildChannel,
    updateLatestBar,
  ]);

  // The effect only clears the previous asset's bar after the render in which
  // the asset changes, so that render must not report it as the new asset's.
  const currentChannel = buildChannel();
  const latestBar = latest?.channel === currentChannel ? latest.bar : null;
  const isLoading =
    Boolean(enabled && assetId && interval && currency) &&
    latestBar === null &&
    !isLatestBarPaused &&
    settledChannel !== currentChannel;

  return { latestBar, isLoading };
}
