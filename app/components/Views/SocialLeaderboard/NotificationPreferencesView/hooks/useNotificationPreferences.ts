import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type {
  NotificationPreferences as StoredNotificationPreferences,
  SocialAIPreference,
} from '@metamask/authenticated-user-storage';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectSelectedInternalAccountId } from '../../../../../selectors/accountsController';

export const TX_AMOUNT_THRESHOLDS = [10, 100, 500, 1000] as const;
export type TxAmountThreshold = (typeof TX_AMOUNT_THRESHOLDS)[number];

const DEFAULT_ENABLED = false;
const DEFAULT_TX_AMOUNT_LIMIT: TxAmountThreshold = 500;

export interface NotificationPreferences {
  /**
   * Whether trading notifications are globally enabled.
   * Maps to socialAI.enabled.
   */
  enabled: boolean;
  /**
   * Dollar threshold for trade notifications.
   * Maps to socialAI.txAmountLimit.
   */
  txAmountLimit: TxAmountThreshold;
  /**
   * Per-trader notification toggles keyed by trader profile ID.
   * Maps to socialAI.traderProfileIds.
   * true = receive notifications, false = muted.
   */
  traderNotifications: Record<string, boolean>;
}

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  setEnabled: (value: boolean) => void;
  setTxAmountLimit: (value: TxAmountThreshold) => void;
  toggleTraderNotification: (traderId: string) => void;
}

/**
 * Manages local notification preference state for the Top Traders feature.
 *
 * Accepts the list of followed traders so per-trader toggles can be
 * initialised from them. New traders added to the follow list default to
 * notifications disabled (opt-in model).
 *
 * TODO: When the backend ships, replace the local useState calls below with
 * reads/writes via SocialController (socialAI.enabled, socialAI.txAmountLimit,
 * socialAI.traderProfileIds) using the existing messenger pattern.
 *
 * @param followedTraders - Traders the current user follows (from useTopTraders).
 */
export const useNotificationPreferences = (
  followedTraders: Pick<TopTrader, 'id'>[],
): UseNotificationPreferencesResult => {
  // TODO: Replace with read from SocialController state (socialAI.enabled)
  const [enabled, setEnabled] = useState<boolean>(DEFAULT_ENABLED);

  // TODO: Replace with read from SocialController state (socialAI.txAmountLimit)
  const [txAmountLimit, setTxAmountLimit] = useState<TxAmountThreshold>(
    DEFAULT_TX_AMOUNT_LIMIT,
  );

  // TODO: Replace with read from SocialController state (socialAI.traderProfileIds)
  const [traderNotifications, setTraderNotifications] = useState<
    Record<string, boolean>
  >(() =>
    followedTraders.reduce<Record<string, boolean>>((acc, trader) => {
      acc[trader.id] = false;
      return acc;
    }, {}),
  );

  // When the followed traders list changes, add new traders defaulting to disabled.
  // Existing trader preferences are preserved.
  useEffect(() => {
    setTraderNotifications((prev) => {
      const updated = { ...prev };
      let changed = false;
      followedTraders.forEach((trader) => {
        if (!(trader.id in updated)) {
          updated[trader.id] = false;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [followedTraders]);

  const toggleTraderNotification = useCallback((traderId: string) => {
    // TODO: Persist change via SocialController (socialAI.traderProfileIds)
    setTraderNotifications((prev) => ({
      ...prev,
      [traderId]: !prev[traderId],
    }));
  }, []);

  const handleSetEnabled = useCallback((value: boolean) => {
    // TODO: Persist change via SocialController (socialAI.enabled)
    setEnabled(value);
  }, []);

  const handleSetTxAmountLimit = useCallback((value: TxAmountThreshold) => {
    // TODO: Persist change via SocialController (socialAI.txAmountLimit)
    setTxAmountLimit(value);
  }, []);

  return {
    preferences: {
      enabled,
      txAmountLimit,
      traderNotifications,
    },
    setEnabled: handleSetEnabled,
    setTxAmountLimit: handleSetTxAmountLimit,
    toggleTraderNotification,
  };
};

const CLIENT_TYPE = 'mobile' as const;
const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

/** Used while the initial GET is in-flight or when the server has no row yet. */
const DEFAULT_SOCIAL_AI: SocialAIPreference = {
  enabled: DEFAULT_ENABLED,
  txAmountLimit: DEFAULT_TX_AMOUNT_LIMIT,
  mutedTraderProfileIds: [],
};

export type { SocialAIPreference } from '@metamask/authenticated-user-storage';

export interface UseNotificationPreferencesResult {
  preferences: SocialAIPreference;
  isLoading: boolean;
  error: string | null;
  setEnabled: (value: boolean) => Promise<void>;
  setTxAmountLimit: (value: TxAmountThreshold) => Promise<void>;
  toggleTraderNotification: (traderId: string) => Promise<void>;
  /** Derived selector: is the given trader currently receiving notifications? */
  isTraderNotificationEnabled: (traderId: string) => boolean;
}

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return String(err ?? 'Unknown error');
};

/**
 * True once the remote query reflects the optimistic overlay — the signal to
 * drop the overlay. Muted IDs are compared as sets (order-independent and
 * duplicate-safe).
 */
const hasRemoteCaughtUp = (
  overlay: SocialAIPreference,
  remote: SocialAIPreference,
): boolean => {
  if (overlay === remote) return true;
  if (overlay.enabled !== remote.enabled) return false;
  if (overlay.txAmountLimit !== remote.txAmountLimit) return false;
  const overlaySet = new Set(overlay.mutedTraderProfileIds);
  const remoteSet = new Set(remote.mutedTraderProfileIds);
  if (overlaySet.size !== remoteSet.size) return false;
  for (const id of overlaySet) {
    if (!remoteSet.has(id)) return false;
  }
  return true;
};

/**
 * Merge the supplied `socialAI` slice on top of the remote payload so a PUT
 * doesn't stomp concurrent writes to the other slices (`walletActivity`,
 * `marketing`, `perps`) coming from extension/portfolio.
 */
const mergeForPut = (
  remote: StoredNotificationPreferences | null,
  socialAI: SocialAIPreference,
): StoredNotificationPreferences => {
  const base: StoredNotificationPreferences = remote ?? {
    walletActivity: { enabled: true, accounts: [] },
    marketing: { enabled: false },
    perps: { enabled: true },
    socialAI: DEFAULT_SOCIAL_AI,
  };
  return { ...base, socialAI };
};

/**
 * Notification preferences for the Top Traders feature, backed by
 * `AuthenticatedUserStorageService`.
 *
 * The UI renders `overlay ?? remote`: an optimistic overlay flips the toggles
 * instantly on tap, while a read-merge-write PUT runs in the background and
 * the overlay is dropped once `useQuery` reflects the new value. Failed PUTs
 * roll the overlay back — unless a newer mutation already owns it (tracked
 * via `generationRef`).
 */
export const useNotificationPreferences =
  (): UseNotificationPreferencesResult => {
    // Scope the cache by account so a stale entry from a previous user is
    // never served after an account switch. Fallback keeps the hook usable
    // in tests and pre-auth screens.
    const selectedAccountId =
      useSelector(selectSelectedInternalAccountId) ?? 'anonymous';

    const {
      data,
      isLoading,
      error: queryError,
      refetch,
    } = useQuery<StoredNotificationPreferences | null>({
      queryKey: [GET_ACTION, selectedAccountId],
    });
    const queryClient = useQueryClient();

    const [overlay, setOverlay] = useState<SocialAIPreference | undefined>(
      undefined,
    );
    const [persistError, setPersistError] = useState<string | null>(null);

    const remoteSocialAI: SocialAIPreference =
      data?.socialAI ?? DEFAULT_SOCIAL_AI;
    const socialAI: SocialAIPreference = overlay ?? remoteSocialAI;

    // Refs mirrored during render so async code never reads stale closures.
    // Safe because each write is idempotent for the same render input.

    // Serializes writes: rapid taps chain instead of interleaving GETs/PUTs.
    const writeChainRef = useRef<Promise<unknown>>(Promise.resolve());

    // Latest *intended* socialAI — updated synchronously in `applyChange`
    // so rapid successive calls chain off each other's output.
    const currentSocialAIRef = useRef<SocialAIPreference>(socialAI);
    currentSocialAIRef.current = socialAI;

    // Latest remote value for the rollback path.
    const remoteRef = useRef<SocialAIPreference>(remoteSocialAI);
    remoteRef.current = remoteSocialAI;

    // Each mutation captures its generation; only rolls back if still current.
    const generationRef = useRef(0);

    const enqueuePersist = useCallback((nextSocialAI: SocialAIPreference) => {
      const next = writeChainRef.current.then(async () => {
        // These actions are registered at runtime by
        // AuthenticatedUserStorageService and aren't in the default messenger's
        // action map, hence the `CallableFunction` cast.
        const latest = (await (
          Engine.controllerMessenger.call as CallableFunction
        )(GET_ACTION)) as StoredNotificationPreferences | null;

        await (Engine.controllerMessenger.call as CallableFunction)(
          PUT_ACTION,
          mergeForPut(latest, nextSocialAI),
          CLIENT_TYPE,
        );
      });
      // Swallow the chain's error so one failure doesn't jam subsequent
      // writes. The returned promise still rejects for the caller.
      writeChainRef.current = next.catch(() => undefined);
      return next;
    }, []);

    const applyChange = useCallback(
      async (updater: (prev: SocialAIPreference) => SocialAIPreference) => {
        generationRef.current += 1;
        const myGeneration = generationRef.current;

        const nextSocialAI = updater(currentSocialAIRef.current);
        currentSocialAIRef.current = nextSocialAI;
        setOverlay(nextSocialAI);
        setPersistError(null);

        try {
          await enqueuePersist(nextSocialAI);
        } catch (err) {
          Logger.error(
            err as Error,
            'useNotificationPreferences: persist failed',
          );
          // Skip rollback if a newer mutation now owns the overlay.
          if (generationRef.current === myGeneration) {
            currentSocialAIRef.current = remoteRef.current;
            setOverlay(undefined);
            setPersistError(toErrorMessage(err));
          }
          return;
        }

        // Prime the cache so (a) the overlay can auto-drop on the next render
        // and (b) reopening the view hydrates instantly — even if the user
        // navigates away before the background refetch returns.
        queryClient.setQueryData<StoredNotificationPreferences | null>(
          [GET_ACTION, selectedAccountId],
          (prev) => mergeForPut(prev ?? null, nextSocialAI),
        );

        // Background reconcile with the server (picks up concurrent writes
        // to other slices). Not awaited — the UI is already correct.
        refetch().catch((err) => {
          Logger.error(
            err as Error,
            'useNotificationPreferences: background refetch after persist failed',
          );
        });
      },
      [enqueuePersist, queryClient, refetch, selectedAccountId],
    );

    useEffect(() => {
      if (overlay && hasRemoteCaughtUp(overlay, remoteSocialAI)) {
        setOverlay(undefined);
      }
    }, [overlay, remoteSocialAI]);

    const setEnabled = useCallback(
      (value: boolean) => applyChange((prev) => ({ ...prev, enabled: value })),
      [applyChange],
    );

    const setTxAmountLimit = useCallback(
      (value: TxAmountThreshold) =>
        applyChange((prev) => ({ ...prev, txAmountLimit: value })),
      [applyChange],
    );

    const toggleTraderNotification = useCallback(
      (traderId: string) =>
        applyChange((prev) => {
          const nextMuted = prev.mutedTraderProfileIds.includes(traderId)
            ? prev.mutedTraderProfileIds.filter((id) => id !== traderId)
            : [...prev.mutedTraderProfileIds, traderId];
          return { ...prev, mutedTraderProfileIds: nextMuted };
        }),
      [applyChange],
    );

    const isTraderNotificationEnabled = useCallback(
      (traderId: string) => !socialAI.mutedTraderProfileIds.includes(traderId),
      [socialAI.mutedTraderProfileIds],
    );

    useEffect(() => {
      if (queryError) {
        Logger.error(
          queryError as Error,
          'useNotificationPreferences: initial fetch failed',
        );
      }
    }, [queryError]);

    const error =
      persistError ?? (queryError ? toErrorMessage(queryError) : null);

    return {
      preferences: socialAI,
      isLoading,
      error,
      setEnabled,
      setTxAmountLimit,
      toggleTraderNotification,
      isTraderNotificationEnabled,
    };
  };

export default useNotificationPreferences;
