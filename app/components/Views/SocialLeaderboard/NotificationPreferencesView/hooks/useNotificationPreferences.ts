import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@metamask/react-data-query';
import type {
  NotificationPreferences as StoredNotificationPreferences,
  SocialAIPreference,
} from '@metamask/authenticated-user-storage';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

export const TX_AMOUNT_THRESHOLDS = [10, 100, 500, 1000] as const;
export type TxAmountThreshold = (typeof TX_AMOUNT_THRESHOLDS)[number];

const DEFAULT_ENABLED = false;
const DEFAULT_TX_AMOUNT_LIMIT: TxAmountThreshold = 500;
const CLIENT_TYPE = 'mobile' as const;
const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

/**
 * Defaults used when the server returns `null` (no preferences stored yet) or
 * while the initial GET is in-flight. Only the `socialAI` slice is relevant
 * to this screen; the other slices are only consulted during a read-merge-write
 * save so we don't stomp on them.
 */
const DEFAULT_SOCIAL_AI: SocialAIPreference = {
  enabled: DEFAULT_ENABLED,
  txAmountLimit: DEFAULT_TX_AMOUNT_LIMIT,
  mutedTraderProfileIds: [],
};

/**
 * Client-facing view of the social AI notification preferences.
 *
 * Intentionally 1:1 with `NotificationPreferences.socialAI` from
 * `@metamask/authenticated-user-storage`:
 *
 * ```ts
 * socialAI: {
 *   enabled: boolean;
 *   txAmountLimit?: number;
 *   // Opt-out list: notifications are muted for traders in this array.
 *   mutedTraderProfileIds: string[];
 * }
 * ```
 */
export interface NotificationPreferences {
  /** Whether trading notifications are globally enabled. */
  enabled: boolean;
  /** Dollar threshold for trade notifications. */
  txAmountLimit: number | undefined;
  /**
   * Profile IDs muted by the user. Traders NOT in this list receive
   * notifications (opt-out semantics).
   */
  mutedTraderProfileIds: string[];
}

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: string | null;
  setEnabled: (value: boolean) => Promise<void>;
  setTxAmountLimit: (value: TxAmountThreshold) => Promise<void>;
  toggleTraderNotification: (traderId: string) => Promise<void>;
  /** Derived selector: is the given trader currently receiving notifications? */
  isTraderNotificationEnabled: (traderId: string) => boolean;
}

/**
 * Structural equality check for two `SocialAIPreference` values. Used to
 * decide when the remote query has caught up with an outstanding optimistic
 * overlay so the overlay can be safely dropped.
 */
const isSocialAIEqual = (
  a: SocialAIPreference,
  b: SocialAIPreference,
): boolean => {
  if (a === b) return true;
  if (a.enabled !== b.enabled) return false;
  if (a.txAmountLimit !== b.txAmountLimit) return false;
  if (a.mutedTraderProfileIds.length !== b.mutedTraderProfileIds.length) {
    return false;
  }
  for (let i = 0; i < a.mutedTraderProfileIds.length; i += 1) {
    if (a.mutedTraderProfileIds[i] !== b.mutedTraderProfileIds[i]) {
      return false;
    }
  }
  return true;
};

/**
 * Build a full `NotificationPreferences` payload suitable for PUT, merging
 * the supplied `socialAI` slice onto the remote value (or sensible defaults
 * if nothing was stored yet).
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
 * Manages notification-preferences state for the Top Traders feature, backed
 * by `AuthenticatedUserStorageService`.
 *
 * Read path: `useQuery` on the
 * `AuthenticatedUserStorageService:getNotificationPreferences` messenger
 * action, seeded with sensible defaults on cold start / 404.
 *
 * Write path: every mutation runs a read-merge-write cycle:
 *
 * 1. Optimistically overlay the mutation on local state so the UI is immediately responsive.
 * 2. Fetch the current `NotificationPreferences` (so we don't stomp on concurrent changes to other slices).
 * 3. PUT `{ ...remote, socialAI: nextSocialAI }`.
 *
 * Writes are serialized through an in-flight promise chain so that rapid
 * successive toggles are applied in order — each save awaits the previous
 * GET+PUT pair, guaranteeing the PUT always sees the freshest remote baseline.
 * If any save fails, the optimistic overlay is rolled back and the error
 * surfaces via the `error` field.
 */
export const useNotificationPreferences =
  (): UseNotificationPreferencesResult => {
    const {
      data,
      isLoading,
      error: queryError,
      refetch,
    } = useQuery<StoredNotificationPreferences | null>({
      queryKey: [GET_ACTION],
    });

    // Optimistic overlay on top of the remote socialAI slice. `undefined`
    // means "defer to the remote value". We never reach into other slices
    // from the UI; the overlay exists purely for responsiveness.
    const [overlay, setOverlay] = useState<SocialAIPreference | undefined>(
      undefined,
    );
    const [persistError, setPersistError] = useState<string | null>(null);

    const remoteSocialAI: SocialAIPreference =
      data?.socialAI ?? DEFAULT_SOCIAL_AI;
    const socialAI: SocialAIPreference = overlay ?? remoteSocialAI;

    // Serialize writes. Each persist awaits the previous one so rapid
    // back-to-back toggles can't interleave GETs and PUTs.
    const writeChainRef = useRef<Promise<unknown>>(Promise.resolve());

    /**
     * Executes a single read-merge-write cycle for the `socialAI` slice:
     * 1. GET the full preferences from the server so we have the freshest baseline (prevents stomping concurrent changes to other slices).
     * 2. Merge `nextSocialAI` on top of the remote baseline.
     * 3. PUT the merged payload.
     */
    const saveSocialAIPreferences = useCallback(
      async (nextSocialAI: SocialAIPreference) => {
        const latest = (await (
          Engine.controllerMessenger.call as CallableFunction
        )(GET_ACTION)) as StoredNotificationPreferences | null;

        const payload = mergeForPut(latest, nextSocialAI);

        await (Engine.controllerMessenger.call as CallableFunction)(
          PUT_ACTION,
          payload,
          CLIENT_TYPE,
        );
      },
      [],
    );

    /**
     * Appends a save to an in-flight promise chain so that rapid consecutive
     * mutations are executed strictly in order — each GET+PUT pair completes
     * before the next one begins. Errors on the chain are swallowed to avoid
     * a single failure jamming subsequent saves; the returned promise still
     * rejects so the caller can handle rollback per-call.
     */
    const enqueuePersist = useCallback(
      (nextSocialAI: SocialAIPreference) => {
        const next = writeChainRef.current.then(() =>
          saveSocialAIPreferences(nextSocialAI),
        );
        writeChainRef.current = next.catch(() => undefined);
        return next;
      },
      [saveSocialAIPreferences],
    );

    const applyChange = useCallback(
      async (nextSocialAI: SocialAIPreference) => {
        const previousOverlay = overlay;
        const previousRemote = remoteSocialAI;
        setOverlay(nextSocialAI);
        setPersistError(null);

        try {
          await enqueuePersist(nextSocialAI);
          // Refresh the query cache so subsequent renders read the new
          // server-of-record value. The overlay stays in place until a
          // `useEffect` below detects the remote has caught up and drops it,
          // so the UI never flashes stale cached data in between.
          await refetch();
        } catch (err) {
          Logger.error(
            err as Error,
            'useNotificationPreferences: persist failed',
          );
          // Revert to the last known good value (either a prior overlay or
          // whatever the remote currently holds).
          setOverlay(previousOverlay ?? previousRemote);
          setPersistError(
            err instanceof Error ? err.message : String(err ?? 'Unknown error'),
          );
        }
      },
      [overlay, remoteSocialAI, enqueuePersist, refetch],
    );

    // Drop the optimistic overlay once the remote query reflects it. Comparing
    // by value (not reference) because `remoteSocialAI` is reconstructed on
    // every render.
    useEffect(() => {
      if (overlay && isSocialAIEqual(overlay, remoteSocialAI)) {
        setOverlay(undefined);
      }
    }, [overlay, remoteSocialAI]);

    const setEnabled = useCallback(
      (value: boolean) => applyChange({ ...socialAI, enabled: value }),
      [socialAI, applyChange],
    );

    const setTxAmountLimit = useCallback(
      (value: TxAmountThreshold) =>
        applyChange({ ...socialAI, txAmountLimit: value }),
      [socialAI, applyChange],
    );

    const toggleTraderNotification = useCallback(
      (traderId: string) => {
        const muted = socialAI.mutedTraderProfileIds;
        const nextMuted = muted.includes(traderId)
          ? muted.filter((id) => id !== traderId)
          : [...muted, traderId];
        return applyChange({
          ...socialAI,
          mutedTraderProfileIds: nextMuted,
        });
      },
      [socialAI, applyChange],
    );

    const isTraderNotificationEnabled = useCallback(
      (traderId: string) => !socialAI.mutedTraderProfileIds.includes(traderId),
      [socialAI.mutedTraderProfileIds],
    );

    const preferences = useMemo<NotificationPreferences>(
      () => ({
        enabled: socialAI.enabled,
        txAmountLimit: socialAI.txAmountLimit,
        mutedTraderProfileIds: socialAI.mutedTraderProfileIds,
      }),
      [socialAI],
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
      persistError ??
      (queryError instanceof Error
        ? queryError.message
        : queryError
          ? String(queryError)
          : null);

    return {
      preferences,
      isLoading,
      error,
      setEnabled,
      setTxAmountLimit,
      toggleTraderNotification,
      isTraderNotificationEnabled,
    };
  };

export default useNotificationPreferences;
