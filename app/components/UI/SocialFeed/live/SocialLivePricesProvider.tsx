import type { OHLCVBar } from '@metamask/core-backend';
import type { PriceUpdate } from '@metamask/perps-controller';
import { useIsFocused } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { AppState, Dimensions, type View } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  PerpsStreamProvider,
  usePerpsStream,
} from '../../Perps/providers/PerpsStreamManager';
import { selectPerpsEnabledFlag } from '../../Perps/selectors/featureFlags';
import {
  planLiveSubscriptions,
  selectVisibleKeys,
  type MeasuredCard,
} from './planLiveSubscriptions';
import {
  SocialLivePricesContext,
  type SocialLivePricesContextValue,
} from './SocialLivePricesContext';
import {
  DEFAULT_LIVE_PRICE_THROTTLE_MS,
  SocialLivePriceStore,
} from './SocialLivePriceStore';
import type { SocialLivePriceKey } from './types';

/** Freshest candle, so `close` tracks the last trade. */
const OHLCV_INTERVAL = '1m';
/** Social cards quote USD. */
const OHLCV_CURRENCY = 'usd';
export const SLOW_NETWORK_THROTTLE_MS = 5000;
const VISIBILITY_DEBOUNCE_MS = 250;
/** Catches programmatic scrolls and list changes that fire no settle event. */
const VISIBILITY_POLL_MS = 4000;
const SUBSCRIBE_DEBOUNCE_MS = 500;
/** Cards within one screen above or below the window stay subscribed. */
const VISIBILITY_BUFFER_SCREENS = 1;

interface Registration {
  key: SocialLivePriceKey;
  ref: RefObject<View | null>;
}

const ohlcvChannel = (assetId: string) =>
  `market-data.v1.${assetId}.${OHLCV_INTERVAL}.${OHLCV_CURRENCY}`;

const subscribeSpot = (assetId: string) =>
  Engine.controllerMessenger.call('OHLCVService:subscribe', {
    assetId,
    interval: OHLCV_INTERVAL,
    currency: OHLCV_CURRENCY,
  });

const unsubscribeSpot = (assetId: string) =>
  Engine.controllerMessenger.call('OHLCVService:unsubscribe', {
    assetId,
    interval: OHLCV_INTERVAL,
    currency: OHLCV_CURRENCY,
  });

const measureCard = ({
  key,
  ref,
}: Registration): Promise<MeasuredCard | null> =>
  new Promise((resolve) => {
    const node = ref.current;
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) =>
      resolve({ key, x, y, width, height }),
    );
  });

const SocialLivePricesHost: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const perpsStream = usePerpsStream();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isFocused = useIsFocused();
  const networkTier = useNetworkTier();
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === 'active',
  );
  const [store] = useState(() => new SocialLivePriceStore());

  // `null` tiers are unknown and treated as default, never as LOW or NONE.
  const reduceMotion = getHardwareTier() === 'LOW';
  const isLive = isFocused && isAppActive && networkTier !== 'NONE';

  const isLiveRef = useRef(isLive);
  isLiveRef.current = isLive;
  const isPerpsEnabledRef = useRef(isPerpsEnabled);
  isPerpsEnabledRef.current = isPerpsEnabled;

  const isMountedRef = useRef(false);
  const registrationsRef = useRef(new Map<string, Registration>());
  const visibleKeysRef = useRef<SocialLivePriceKey[]>([]);
  /** Active spot channels -> the store key their bars publish to. */
  const spotChannelsRef = useRef(new Map<string, SocialLivePriceKey>());
  /** Keeps each channel's subscribe/unsubscribe calls ordered. */
  const spotOperationQueuesRef = useRef(new Map<string, Promise<unknown>>());
  const spotOperationTokensRef = useRef(new Map<string, symbol>());
  const perpUnsubscribeRef = useRef<(() => void) | null>(null);
  const perpSymbolsKeyRef = useRef('');
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    store.setThrottleMs(
      networkTier === 'SLOW_CELLULAR'
        ? SLOW_NETWORK_THROTTLE_MS
        : DEFAULT_LIVE_PRICE_THROTTLE_MS,
    );
  }, [networkTier, store]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setIsAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  const enqueueSpotOperation = useCallback(
    (channel: string, operation: () => Promise<unknown>): Promise<unknown> => {
      const previousOperation =
        spotOperationQueuesRef.current.get(channel) ?? Promise.resolve();
      const operationToken = Symbol(channel);
      spotOperationTokensRef.current.set(channel, operationToken);
      const operationPromise = previousOperation
        .catch(() => undefined)
        .then(operation);
      const cleanup = () => {
        if (spotOperationTokensRef.current.get(channel) === operationToken) {
          spotOperationQueuesRef.current.delete(channel);
          spotOperationTokensRef.current.delete(channel);
        }
      };
      const trackedOperation = operationPromise.then(
        (result) => {
          cleanup();
          return result;
        },
        (error) => {
          cleanup();
          throw error;
        },
      );
      spotOperationQueuesRef.current.set(channel, trackedOperation);
      return trackedOperation;
    },
    [],
  );

  const syncSubscriptions = useCallback(() => {
    const keys = isLiveRef.current ? visibleKeysRef.current : [];
    const { spotAssetIds, perpSymbols } = planLiveSubscriptions(keys);

    const nextChannels = new Map(
      spotAssetIds.map((assetId) => [
        ohlcvChannel(assetId),
        { assetId, key: `spot:${assetId}` as SocialLivePriceKey },
      ]),
    );
    spotChannelsRef.current.forEach((key, channel) => {
      if (!nextChannels.has(channel)) {
        spotChannelsRef.current.delete(channel);
        enqueueSpotOperation(channel, () =>
          unsubscribeSpot(key.slice('spot:'.length)),
        ).catch(() => undefined);
      }
    });
    nextChannels.forEach(({ assetId, key }, channel) => {
      if (!spotChannelsRef.current.has(channel)) {
        spotChannelsRef.current.set(channel, key);
        enqueueSpotOperation(channel, () => subscribeSpot(assetId)).catch(
          () => undefined,
        );
      }
    });

    const symbols = isPerpsEnabledRef.current ? perpSymbols : [];
    const symbolsKey = symbols.join(',');
    if (symbolsKey === perpSymbolsKeyRef.current) {
      return;
    }
    perpSymbolsKeyRef.current = symbolsKey;
    perpUnsubscribeRef.current?.();
    perpUnsubscribeRef.current = null;
    if (symbols.length === 0) {
      return;
    }
    const tracked = new Set(symbols);
    perpUnsubscribeRef.current = perpsStream.prices.subscribeToSymbols({
      symbols,
      callback: (prices: Record<string, PriceUpdate>) => {
        if (!prices) {
          return;
        }
        Object.entries(prices).forEach(([symbol, update]) => {
          if (!tracked.has(symbol) || !update) {
            return;
          }
          const price = Number.parseFloat(update.markPrice ?? update.price);
          store.publish(`perp:${symbol}`, price);
        });
      },
      throttleMs: DEFAULT_LIVE_PRICE_THROTTLE_MS,
    });
  }, [enqueueSpotOperation, perpsStream, store]);

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      syncSubscriptions();
    }, SUBSCRIBE_DEBOUNCE_MS);
  }, [syncSubscriptions]);

  const measureVisibleKeys = useCallback(async () => {
    const cards = await Promise.all(
      [...registrationsRef.current.values()].map(measureCard),
    );
    if (!isMountedRef.current || !isLiveRef.current) {
      return;
    }
    const viewport = Dimensions.get('window');
    const keys = selectVisibleKeys(
      cards.filter((card): card is MeasuredCard => card != null),
      viewport,
      viewport.height * VISIBILITY_BUFFER_SCREENS,
    );
    if (keys.join('|') === visibleKeysRef.current.join('|')) {
      return;
    }
    visibleKeysRef.current = keys;
    scheduleSync();
  }, [scheduleSync]);

  const requestVisibilityCheck = useCallback(
    (delayMs: number = VISIBILITY_DEBOUNCE_MS) => {
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current);
      }
      visibilityTimerRef.current = setTimeout(() => {
        visibilityTimerRef.current = null;
        if (isLiveRef.current) {
          measureVisibleKeys().catch(() => undefined);
        }
      }, delayMs);
    },
    [measureVisibleKeys],
  );

  const register = useCallback(
    (id: string, key: SocialLivePriceKey, ref: RefObject<View | null>) => {
      registrationsRef.current.set(id, { key, ref });
      requestVisibilityCheck();
      return () => {
        if (registrationsRef.current.get(id)?.ref === ref) {
          registrationsRef.current.delete(id);
          requestVisibilityCheck();
        }
      };
    },
    [requestVisibilityCheck],
  );

  useEffect(() => {
    const handleBarUpdated = ({
      channel,
      bar,
    }: {
      channel: string;
      bar: OHLCVBar;
    }) => {
      const key = spotChannelsRef.current.get(channel);
      if (key) {
        store.publish(key, bar.close);
      }
    };
    (Engine.controllerMessenger.subscribe as (...args: unknown[]) => void)(
      'OHLCVService:barUpdated',
      handleBarUpdated,
    );
    return () => {
      (Engine.controllerMessenger.unsubscribe as (...args: unknown[]) => void)(
        'OHLCVService:barUpdated',
        handleBarUpdated,
      );
    };
  }, [store]);

  useEffect(() => {
    if (!isLive) {
      store.cancelPending();
      syncSubscriptions();
      return undefined;
    }
    requestVisibilityCheck(0);
    syncSubscriptions();
    const interval = setInterval(
      () => requestVisibilityCheck(0),
      VISIBILITY_POLL_MS,
    );
    return () => clearInterval(interval);
  }, [
    isLive,
    isPerpsEnabled,
    requestVisibilityCheck,
    store,
    syncSubscriptions,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    const spotChannels = spotChannelsRef.current;
    return () => {
      isMountedRef.current = false;
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current);
      }
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      store.cancelPending();
      spotChannels.forEach((key, channel) =>
        enqueueSpotOperation(channel, () =>
          unsubscribeSpot(key.slice('spot:'.length)),
        ).catch(() => undefined),
      );
      spotChannels.clear();
      perpUnsubscribeRef.current?.();
      perpUnsubscribeRef.current = null;
    };
  }, [enqueueSpotOperation, store]);

  const value = useMemo<SocialLivePricesContextValue>(
    () => ({ store, register, requestVisibilityCheck, reduceMotion }),
    [store, register, requestVisibilityCheck, reduceMotion],
  );

  return (
    <SocialLivePricesContext.Provider value={value}>
      {children}
    </SocialLivePricesContext.Provider>
  );
};

/**
 * Streams live prices to the open position cards on screen beneath it: spot
 * assets over the `market-data.v1` candle channel (the in-progress candle's
 * close is the last trade), perps over the Hyperliquid price stream.
 *
 * Only cards inside the window plus a screen of buffer are subscribed, spot is
 * capped at `SPOT_CHANNEL_CAP` channels, and everything is dropped while the
 * screen is blurred, the app is backgrounded or the network is down. There is
 * no REST fallback: without a stream, cards keep their API snapshot.
 */
const SocialLivePricesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <PerpsStreamProvider>
    <SocialLivePricesHost>{children}</SocialLivePricesHost>
  </PerpsStreamProvider>
);

export default SocialLivePricesProvider;
