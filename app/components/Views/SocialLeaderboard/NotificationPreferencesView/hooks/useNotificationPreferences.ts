import { useCallback, useEffect, useRef, useState } from 'react';
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
 * Re-export of the storage-layer type so consumers import the UI state type
 * from here and don't need to know about the underlying package. The shape is
 * intentionally identical — there's no value in duplicating it today.
 */
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

/**
 * Convert an unknown thrown value into a user-facing error string.
 */
const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return String(err ?? 'Unknown error');
};

/**
 * True once the remote query reflects the optimistic overlay, signalling that
 * the overlay can be dropped. Order-independent comparison on the muted list:
 * the server may return the same IDs in a different order.
 */
const hasRemoteCaughtUp = (
  overlay: SocialAIPreference,
  remote: SocialAIPreference,
): boolean => {
  if (overlay === remote) return true;
  if (overlay.enabled !== remote.enabled) return false;
  if (overlay.txAmountLimit !== remote.txAmountLimit) return false;
  if (
    overlay.mutedTraderProfileIds.length !== remote.mutedTraderProfileIds.length
  ) {
    return false;
  }
  const remoteSet = new Set(remote.mutedTraderProfileIds);
  return overlay.mutedTraderProfileIds.every((id) => remoteSet.has(id));
};

/**
 * Build a full storage payload suitable for PUT, merging the supplied
 * `socialAI` slice on top of the remote value (or sensible defaults if
 * nothing was stored yet).
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
 * Manages notification preferences for the Top Traders feature, backed by
 * `AuthenticatedUserStorageService`.
 *
 * ## Mental model
 *
 * Three layers of state collapse into the value the UI renders:
 *
 * ```
 * 1. REMOTE           data?.socialAI       (source of truth, from useQuery)
 * 2. OPTIMISTIC       overlay              (local; shown while PUT is in flight)
 * 3. DISPLAYED        overlay ?? remote    (what the UI sees)
 * ```
 *
 * ### Why the optimistic overlay?
 *
 * React Native `<Switch>` and radio components are controlled: their visible
 * state is driven entirely by their `value` prop. Without an overlay we'd
 * have to wait for `PUT → refetch` (~0.5–2s round trip, worse on flaky
 * networks) before the toggle visually moves. Users read that as "my tap
 * didn't register" and tap again, which cascades into duplicate mutations.
 * The overlay flips the UI immediately on tap; the network work happens in
 * the background. The rollback machinery below is the price of this bet.
 *
 * ### Mutation pipeline
 *
 * 1. Overlay the new value synchronously so the UI responds instantly.
 * 2. Enqueue a persist onto a serial promise chain.
 * 3. The persist does a read-merge-write cycle: GET latest, merge only the
 *    `socialAI` slice (so concurrent changes to `walletActivity`/`marketing`/
 *    `perps` from other clients are preserved), PUT the full payload.
 * 4. On success → `refetch()`. The overlay auto-drops once remote catches up.
 * 5. On failure → roll back the overlay, unless a newer mutation has already
 *    taken ownership of it.
 */
export const useNotificationPreferences =
  (): UseNotificationPreferencesResult => {
    const {
      data,
      isLoading,
      error: queryError,
      refetch,
    } = useQuery<StoredNotificationPreferences | null>({
      // The query key intentionally omits a user/profile identifier: on
      // mobile the bearer token is always the active account's, and an
      // account switch triggers a full session reset that unmounts this
      // hook and clears the query cache.
      queryKey: [GET_ACTION],
    });

    // Optimistic overlay on top of the remote socialAI slice. `undefined`
    // means "defer to remote". We never touch other slices from the UI;
    // the overlay exists purely for responsiveness.
    const [overlay, setOverlay] = useState<SocialAIPreference | undefined>(
      undefined,
    );
    const [persistError, setPersistError] = useState<string | null>(null);

    const remoteSocialAI: SocialAIPreference =
      data?.socialAI ?? DEFAULT_SOCIAL_AI;
    const socialAI: SocialAIPreference = overlay ?? remoteSocialAI;

    // --- Refs used across async boundaries ---------------------------------
    // These are mirrored synchronously during render (see below). Writing
    // refs during render is safe as long as the write is idempotent for the
    // same input, which it is here — React 18 strict-mode double-renders
    // simply assign the same value twice.

    // Serializes writes: each persist awaits the previous one so rapid
    // back-to-back toggles can't interleave GETs and PUTs.
    const writeChainRef = useRef<Promise<unknown>>(Promise.resolve());

    // The latest *intended* socialAI. Updated synchronously in `applyChange`
    // before any async work so that the next rapid call's updater starts
    // from the freshest value — even before React has re-rendered with the
    // new overlay.
    const currentSocialAIRef = useRef<SocialAIPreference>(socialAI);
    currentSocialAIRef.current = socialAI;

    // Mirrors `remoteSocialAI` so the async rollback path always reads the
    // latest server-side value without capturing a stale closure.
    const remoteRef = useRef<SocialAIPreference>(remoteSocialAI);
    remoteRef.current = remoteSocialAI;

    // Monotonically increasing counter. Each `applyChange` captures its own
    // generation; a failing call only rolls back if no newer mutation has
    // since taken ownership of the overlay.
    const generationRef = useRef(0);

    /**
     * Appends a read-merge-write cycle to the serial write chain:
     *
     * 1. GET the current preferences from the server (freshest baseline so
     * we don't stomp concurrent changes to other slices).
     * 2. Merge `nextSocialAI` on top of that baseline.
     * 3. PUT the merged payload.
     *
     * Errors on the chain are swallowed internally to avoid a single failure
     * jamming subsequent saves; the returned promise still rejects so the
     * caller can roll back per-call.
     */
    const enqueuePersist = useCallback((nextSocialAI: SocialAIPreference) => {
      const next = writeChainRef.current.then(async () => {
        // `as CallableFunction` bypasses the messenger's strict overload
        // typing: these actions are registered by
        // AuthenticatedUserStorageService and aren't in the default
        // messenger's action map here.
        const latest = (await (
          Engine.controllerMessenger.call as CallableFunction
        )(GET_ACTION)) as StoredNotificationPreferences | null;

        await (Engine.controllerMessenger.call as CallableFunction)(
          PUT_ACTION,
          mergeForPut(latest, nextSocialAI),
          CLIENT_TYPE,
        );
      });
      writeChainRef.current = next.catch(() => undefined);
      return next;
    }, []);

    const applyChange = useCallback(
      async (updater: (prev: SocialAIPreference) => SocialAIPreference) => {
        generationRef.current += 1;
        const myGeneration = generationRef.current;

        const nextSocialAI = updater(currentSocialAIRef.current);
        // Update the ref synchronously so the next rapid call chains on top
        // of this mutation's output, not the stale render-time value.
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
          // Only roll back if we still own the overlay. If a newer mutation
          // has started, it owns the overlay now and rolling back here would
          // corrupt its optimistic state.
          if (generationRef.current === myGeneration) {
            // Revert to server truth (not a captured snapshot) so any prior
            // successful mutations are correctly preserved.
            currentSocialAIRef.current = remoteRef.current;
            setOverlay(undefined);
            setPersistError(toErrorMessage(err));
          }
          return;
        }

        // Persist succeeded. Refresh the query cache so the overlay auto-
        // drops via the `useEffect` below once remote reflects the new
        // value. A refetch failure is non-critical — the save already
        // succeeded — so we log and keep the overlay in place.
        try {
          await refetch();
        } catch (err) {
          Logger.error(
            err as Error,
            'useNotificationPreferences: cache refresh after persist failed',
          );
        }
      },
      [enqueuePersist, refetch],
    );

    // Drop the optimistic overlay once the remote query has caught up.
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
      // `socialAI` is already `SocialAIPreference`-shaped and has stable
      // identity when neither overlay nor remote has changed.
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
