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
  /** When false, skips subscription (e.g. legacy chart fallback) */
  enabled: boolean;
}

export interface UseOHLCVRealtimeResult {
  /** Latest bar from WebSocket stream (timestamp in seconds, as received from OHLCVService) */
  latestBar: WSOHLCVBar | null;
}

const DEBOUNCE_MS = 300;

/**
 * Subscribes to real-time OHLCV candle updates via OHLCVService (WebSocket).
 * Uses a 300ms debounce before subscribing to avoid thrashing during rapid
 * time-range or asset navigation changes.
 */
export function useOHLCVRealtime({
  assetId,
  interval,
  currency,
  enabled,
}: UseOHLCVRealtimeOptions): UseOHLCVRealtimeResult {
  const [latestBar, setLatestBar] = useState<WSOHLCVBar | null>(null);
  const subscribedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<string>('');

  const buildChannel = useCallback(
    () => `market-data.v1.${assetId}.${interval}.${currency}`,
    [assetId, interval, currency],
  );

  useEffect(() => {
    if (!enabled || !assetId || !interval || !currency) {
      console.log(
        `[OHLCVRealtime] Skipping — enabled=${enabled}, assetId=${assetId}, interval=${interval}, currency=${currency}`,
      );
      return;
    }

    const channel = buildChannel();
    channelRef.current = channel;
    setLatestBar(null);

    console.log(
      `[OHLCVRealtime] Setting up subscription for channel: ${channel}`,
    );

    const handleBarUpdated = (payload: {
      channel: string;
      bar: WSOHLCVBar;
    }) => {
      if (payload.channel === channelRef.current) {
        console.log(
          `[OHLCVRealtime] Bar received — channel=${payload.channel}, close=${payload.bar.close}, ts=${payload.bar.timestamp}`,
        );
        setLatestBar(payload.bar);
      }
    };

    const handleSubscriptionError = (payload: {
      channel: string;
      error: string;
      operation: string;
    }) => {
      console.log(
        `[OHLCVRealtime] Subscription error on ${payload.channel}: ${payload.error} (${payload.operation})`,
      );
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

    // Debounce the actual WS subscribe call
    debounceTimerRef.current = setTimeout(async () => {
      console.log(
        `[OHLCVRealtime] Debounce fired — calling OHLCVService:subscribe for ${channel}`,
      );
      try {
        await Engine.controllerMessenger.call('OHLCVService:subscribe', {
          assetId,
          interval,
          currency,
        });
        subscribedRef.current = true;
        console.log(`[OHLCVRealtime] Subscribe SUCCESS for ${channel}`);
      } catch (err) {
        console.log(
          `[OHLCVRealtime] Failed to subscribe: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }, DEBOUNCE_MS);

    return () => {
      console.log(
        `[OHLCVRealtime] Cleanup — channel=${channel}, wasSubscribed=${subscribedRef.current}`,
      );

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      (Engine.controllerMessenger.unsubscribe as (...args: unknown[]) => void)(
        'OHLCVService:barUpdated',
        handleBarUpdated,
      );
      (Engine.controllerMessenger.unsubscribe as (...args: unknown[]) => void)(
        'OHLCVService:subscriptionError',
        handleSubscriptionError,
      );

      if (subscribedRef.current) {
        console.log(
          `[OHLCVRealtime] Calling OHLCVService:unsubscribe for ${channel}`,
        );
        Engine.controllerMessenger
          .call('OHLCVService:unsubscribe', { assetId, interval, currency })
          .then(() => {
            console.log(`[OHLCVRealtime] Unsubscribe SUCCESS for ${channel}`);
          })
          .catch((err: unknown) => {
            console.log(
              `[OHLCVRealtime] Failed to unsubscribe: ${err instanceof Error ? (err as Error).message : String(err)}`,
            );
          });
        subscribedRef.current = false;
      }
    };
  }, [assetId, interval, currency, enabled, buildChannel]);

  return { latestBar };
}
