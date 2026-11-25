import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import {
  type PerpsAccountSupport,
  type PerpsAccountUnsupportedReason,
  type PerpsProviderType,
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { ensureError } from '../../../../util/errorUtils';
import type { PerpsTooltipContentKey } from '../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import { usePerpsEventTracking } from './usePerpsEventTracking';

/**
 * `screen_type` value emitted with `Perp Screen Viewed` when an
 * unsupported-account explanation is presented. Mobile-local; a candidate to
 * move into Core's `PERPS_EVENT_VALUE.SCREEN_TYPE`.
 */
export const PERPS_ACCOUNT_UNSUPPORTED_SCREEN_TYPE = 'account_unsupported';

const unsupportedContent = {
  multi_sig_account: 'account_not_supported',
} as const satisfies Record<
  PerpsAccountUnsupportedReason,
  PerpsTooltipContentKey
>;
export type UnsupportedContentKey =
  (typeof unsupportedContent)[PerpsAccountUnsupportedReason];

interface UnsupportedExplanation {
  contextKey: string;
  reason: PerpsAccountUnsupportedReason;
}

export type PerpsAccountSupportCheckResult =
  | 'supported'
  | 'unsupported'
  | 'stale'
  | 'unmounted';

export interface CheckPerpsAccountSupportOptions {
  /** Withdrawals sign with the live venue, even when a route was requested. */
  bindActiveProvider?: boolean;
  /** A committed deposit reports its outcome via the progress toast instead. */
  showExplanation?: boolean;
}

export interface UsePerpsAccountSupportOptions {
  /**
   * Skip the mount-time prefetch. For callers whose actions never sign
   * (e.g. a deposit-only sheet), where only the action-time check matters.
   */
  skipPrefetch?: boolean;
}

export interface UsePerpsAccountSupportReturn {
  unsupportedContentKey: UnsupportedContentKey | null;
  /** Opens the explanation synchronously only if prefetch already found a blocker. */
  showPrefetchedUnsupported: () => boolean;
  /** Identity checked for a pinned or active venue, read from the live store. */
  readContextKey: (providerId?: PerpsProviderType) => string;
  checkAccountSupport: (
    providerId?: PerpsProviderType,
    options?: CheckPerpsAccountSupportOptions,
  ) => Promise<PerpsAccountSupportCheckResult>;
  closeAccountUnsupportedModal: () => void;
}

const getSupportContextKey = (
  state: RootState,
  providerId?: PerpsProviderType,
  bindActiveProvider = false,
) => {
  const activeProvider = selectPerpsProvider(state);
  const context = [
    selectSelectedInternalAccountAddress(state),
    providerId ?? activeProvider,
    selectPerpsNetwork(state),
    bindActiveProvider ? activeProvider : undefined,
  ] as const;
  return JSON.stringify(context);
};

/**
 * Reads provider-owned account support before actions that can sign.
 *
 * The controller owns detection and caching. A failed read fails open; Core
 * still enforces the check immediately before supported providers sign.
 */
export const usePerpsAccountSupport = (
  source: string,
  prefetchProviderId?: PerpsProviderType,
  options?: UsePerpsAccountSupportOptions,
): UsePerpsAccountSupportReturn => {
  const store = useStore<RootState>();
  const contextKey = useSelector((state: RootState) =>
    getSupportContextKey(state, prefetchProviderId, true),
  );
  const readContextKey = useCallback(
    (providerId?: PerpsProviderType, bindActiveProvider = false) =>
      getSupportContextKey(store.getState(), providerId, bindActiveProvider),
    [store],
  );
  const isMountedRef = useRef(true);

  // Keyed to the context it was shown for so a switch hides it at once,
  // before the next support read settles.
  const [explanation, setExplanation] = useState<UnsupportedExplanation | null>(
    null,
  );
  const prefetched = useRef<UnsupportedExplanation | null>(null);
  const unsupportedContentKey =
    explanation?.contextKey === contextKey
      ? unsupportedContent[explanation.reason]
      : null;
  const { track } = usePerpsEventTracking();
  const shownContext = useRef<string | null>(null);
  useEffect(() => {
    if (unsupportedContentKey && shownContext.current !== contextKey) {
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_ACCOUNT_UNSUPPORTED_SCREEN_TYPE,
        [PERPS_EVENT_PROPERTY.SOURCE]: source,
      });
    }
    shownContext.current = unsupportedContentKey ? contextKey : null;
  }, [contextKey, source, track, unsupportedContentKey]);

  const readAccountSupport = useCallback(
    async (
      providerId?: PerpsProviderType,
      /** Prefetch failures fail open silently; only action-time reads report. */
      reportErrors = true,
    ): Promise<PerpsAccountSupport> => {
      const state = store.getState();
      const network = selectPerpsNetwork(state);
      try {
        return await Engine.context.PerpsController.getAccountSupport(
          providerId ? { providerId } : undefined,
        );
      } catch (error) {
        const name = 'usePerpsAccountSupport.readAccountSupport';
        const errorObj = ensureError(error, name);
        if (reportErrors) {
          Logger.error(errorObj, {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
            context: {
              name,
              data: {
                providerId: providerId ?? selectPerpsProvider(state),
                network,
              },
            },
          });
        } else {
          // Core can reject a prefetch with PROVIDER_LIFECYCLE_STALE during a
          // reconnect; the check fails open and the action-time read reports.
          DevLogger.log(
            name,
            'Prefetch skipped (fail open)',
            errorObj.message,
          );
        }
        return { isSupported: true };
      }
    },
    [store],
  );

  useEffect(() => {
    if (options?.skipPrefetch) {
      return undefined;
    }
    let current = true;
    prefetched.current = null;
    void readAccountSupport(prefetchProviderId, false).then((support) => {
      if (current && !support.isSupported) {
        prefetched.current = { contextKey, reason: support.reason };
      }
    });
    return () => {
      current = false;
    };
  }, [
    contextKey,
    options?.skipPrefetch,
    prefetchProviderId,
    readAccountSupport,
  ]);

  const showPrefetchedUnsupported = useCallback(() => {
    const known = prefetched.current;
    if (!known || known.contextKey !== readContextKey(prefetchProviderId, true))
      return false;
    setExplanation(known);
    return true;
  }, [prefetchProviderId, readContextKey]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resolveSupportCheck = useCallback(
    async (
      providerId?: PerpsProviderType,
      options?: CheckPerpsAccountSupportOptions,
    ): Promise<PerpsAccountSupportCheckResult> => {
      const requestedContext = readContextKey(
        providerId,
        options?.bindActiveProvider,
      );
      const support = await readAccountSupport(providerId);
      const unmounted = !isMountedRef.current;
      // Read the live store, not render state: a committed post-deposit
      // order resolves after its view unmounts and must still see a switch.
      // An explicit providerId ignores the active provider on its own, so
      // withdrawals also bind the active provider mode.
      if (
        readContextKey(providerId, options?.bindActiveProvider) !==
        requestedContext
      ) {
        return 'stale';
      }
      if (!support.isSupported) {
        if (!unmounted && options?.showExplanation !== false) {
          setExplanation({
            contextKey: readContextKey(prefetchProviderId, true),
            reason: support.reason,
          });
        }
        return 'unsupported';
      }
      if (unmounted) {
        return 'unmounted';
      }
      return 'supported';
    },
    [prefetchProviderId, readAccountSupport, readContextKey],
  );

  const checkAccountSupport = useCallback(
    async (
      providerId?: PerpsProviderType,
      options?: CheckPerpsAccountSupportOptions,
    ): Promise<PerpsAccountSupportCheckResult> => {
      const traceId = uuidv4();
      let result: PerpsAccountSupportCheckResult | undefined;
      trace({
        name: TraceName.PerpsAccountSupportCheck,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider:
            providerId ?? selectPerpsProvider(store.getState()) ?? 'unknown',
        },
      });
      try {
        result = await resolveSupportCheck(providerId, options);
        return result;
      } finally {
        endTrace({
          name: TraceName.PerpsAccountSupportCheck,
          id: traceId,
          data: { result: result ?? 'error' },
        });
      }
    },
    [resolveSupportCheck, store],
  );

  const closeAccountUnsupportedModal = useCallback(() => {
    // A hint must not lock the user out across venue sessions. After
    // dismissal they can retry; submit will consult the controller.
    prefetched.current = null;
    setExplanation(null);
  }, []);

  return {
    unsupportedContentKey,
    showPrefetchedUnsupported,
    readContextKey,
    checkAccountSupport,
    closeAccountUnsupportedModal,
  };
};
