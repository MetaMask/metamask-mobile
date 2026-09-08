import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { parseCaipAssetType } from '@metamask/utils';
import type { OHLCVBar } from '@metamask/core-backend';
import Engine from '../../../../../core/Engine';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import type { BridgeToken } from '../../types';
import { normalizeTokenAddress } from '../../utils/tokenUtils';
import { useTokenFiatRate } from '../useTokenFiatRate';
import { UseLiveTokenFiatRateOptions } from './types';

const DEFAULT_OPTIONS = {
  interval: '1m',
  subscriptionDebounceMs: 500,
  stalenessCheckIntervalMs: 5_000,
  stalenessThresholdMs: 4 * 5_000, // Four missed pushes.
} as const satisfies Required<UseLiveTokenFiatRateOptions>;

/**
 * Fallback for a token the market-data channel can't serve.
 */
const NO_ASSET = { assetId: '', chainId: '' };

/**
 * Token fiat rate using the real-time OHLCV WebSocket price, falling
 * back to the polled Redux rate from {@link useTokenFiatRate}.
 *
 * The live value is the close of the in-progress candle, i.e. the most recent
 * traded price, refreshed every 5s. It is dropped in favour of the Redux rate
 * whenever the socket can't serve the asset: unsupported asset ID, subscribe
 * failure, the chain reporting down, or the stream going quiet.
 */
export const useLiveTokenFiatRate = (
  token?: BridgeToken,
  {
    interval = DEFAULT_OPTIONS.interval,
    subscriptionDebounceMs = DEFAULT_OPTIONS.subscriptionDebounceMs,
    stalenessCheckIntervalMs = DEFAULT_OPTIONS.stalenessCheckIntervalMs,
    stalenessThresholdMs = DEFAULT_OPTIONS.stalenessThresholdMs,
  }: UseLiveTokenFiatRateOptions = {},
) => {
  const fallbackRate = useTokenFiatRate(token);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currency = (currentCurrency || 'usd').toLowerCase();

  const { assetId, chainId } = useMemo(() => {
    if (!token?.address || !token?.chainId) {
      return NO_ASSET;
    }

    try {
      const caipAssetId = formatAddressToAssetId(
        normalizeTokenAddress(token.address, token.chainId),
        token.chainId,
      );

      return caipAssetId
        ? {
            assetId: caipAssetId,
            chainId: parseCaipAssetType(caipAssetId).chainId,
          }
        : NO_ASSET;
    } catch {
      // Throws for chains outside XChain Swaps/Bridge support, which have no
      // market-data channel anyway.
      return NO_ASSET;
    }
  }, [token?.address, token?.chainId]);

  const [liveRate, setLiveRate] = useState<number | undefined>(undefined);
  const channelRef = useRef('');
  const cancelledRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stalenessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageTimeRef = useRef(0);

  const handleBarUpdated = useCallback(
    (payload: { channel: string; bar: OHLCVBar }) => {
      if (payload.channel !== channelRef.current) {
        return;
      }

      lastMessageTimeRef.current = Date.now();

      // A candle with no trades in it re-sends the previous close, which React
      // bails out on, so idle assets cost no re-renders.
      setLiveRate(payload.bar.close > 0 ? payload.bar.close : undefined);
    },
    [],
  );

  const handleSubscriptionError = useCallback(
    (payload: { channel: string; error: string; operation: string }) => {
      if (
        payload.operation === 'subscribe' &&
        payload.channel === channelRef.current
      ) {
        setLiveRate(undefined);
      }
    },
    [],
  );

  const handleChainStatusChanged = useCallback(
    (payload: { chainIds: string[]; status: 'up' | 'down' }) => {
      if (payload.status === 'down' && payload.chainIds.includes(chainId)) {
        setLiveRate(undefined);
      }
    },
    [chainId],
  );

  const clearSubscriptions = useCallback(() => {
    cancelledRef.current = true;

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
      .call('OHLCVService:unsubscribe', {
        assetId,
        interval,
        currency,
      })
      .catch(() => {
        // Non-fatal: the service's grace period handles cleanup.
      });
  }, [
    assetId,
    currency,
    handleBarUpdated,
    handleChainStatusChanged,
    handleSubscriptionError,
    interval,
  ]);

  useEffect(() => {
    if (!assetId || !currency) {
      return;
    }

    const channel = `market-data.v1.${assetId}.${interval}.${currency}`;
    channelRef.current = channel;
    cancelledRef.current = false;
    lastMessageTimeRef.current = 0;
    setLiveRate(undefined);

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
      if (lastMessageTimeRef.current > 0 && elapsed >= stalenessThresholdMs) {
        setLiveRate(undefined);
      }
    }, stalenessCheckIntervalMs);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await Engine.controllerMessenger.call('OHLCVService:subscribe', {
          assetId,
          interval,
          currency,
        });

        if (cancelledRef.current) {
          await Engine.controllerMessenger.call('OHLCVService:unsubscribe', {
            assetId,
            interval,
            currency,
          });
          return;
        }

        // Start the staleness clock only once the stream is live.
        lastMessageTimeRef.current = Date.now();
      } catch {
        // Surfaced via subscriptionError, which falls back to the Redux rate.
      }
    }, subscriptionDebounceMs);

    return clearSubscriptions;
  }, [
    assetId,
    chainId,
    clearSubscriptions,
    currency,
    handleBarUpdated,
    handleChainStatusChanged,
    handleSubscriptionError,
    interval,
    stalenessCheckIntervalMs,
    stalenessThresholdMs,
    subscriptionDebounceMs,
  ]);

  return liveRate ?? fallbackRate;
};
