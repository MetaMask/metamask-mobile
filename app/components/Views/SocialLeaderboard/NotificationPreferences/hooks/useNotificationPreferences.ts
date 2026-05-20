import { useCallback, useEffect, useRef, useState } from 'react';
import type { SocialAIPreference } from '@metamask/authenticated-user-storage';
import Logger from '../../../../../util/Logger';
import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller';
import { useNotificationStoragePreferences } from '../../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences';

export type { SocialAIPreference } from '@metamask/authenticated-user-storage';

export const TX_AMOUNT_THRESHOLDS = [10, 100, 500, 1000] as const;
export type TxAmountThreshold = (typeof TX_AMOUNT_THRESHOLDS)[number];

export const DEFAULT_TX_AMOUNT_LIMIT =
  DEFAULT_SOCIAL_AI_PREFERENCES.txAmountLimit as TxAmountThreshold;

const getDefaultSocialAIPreferences = (): SocialAIPreference => ({
  ...DEFAULT_SOCIAL_AI_PREFERENCES,
  mutedTraderProfileIds: [
    ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
  ],
});

/** Used while the initial GET is in-flight or when the server has no row yet. */
const DEFAULT_SOCIAL_AI: SocialAIPreference = getDefaultSocialAIPreferences();

export interface UseNotificationPreferencesResult {
  preferences: SocialAIPreference;
  hasNotificationPreferences: boolean;
  isLoading: boolean;
  error: string | null;
  setPushNotificationsEnabled: (value: boolean) => Promise<void>;
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
  if (
    overlay.pushNotificationsEnabled !== remote.pushNotificationsEnabled ||
    overlay.inAppNotificationsEnabled !== remote.inAppNotificationsEnabled
  ) {
    return false;
  }
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
 * Notification preferences for the Top Traders feature, backed by
 * the shared notification preferences stored in
 * `AuthenticatedUserStorageService`.
 *
 * The UI renders `overlay ?? remote`: an optimistic overlay flips the toggles
 * instantly on tap, while a read-merge-write PUT runs in the background and
 * the overlay is dropped once the shared preferences query reflects the new
 * value. Failed PUTs roll the overlay back — unless a newer mutation already
 * owns it (tracked via `generationRef`).
 */
export const useNotificationPreferences =
  (): UseNotificationPreferencesResult => {
    const {
      preferences: storagePreferences,
      hasNotificationPreferences,
      isLoading,
      error: queryError,
      updatePreferencesSection,
    } = useNotificationStoragePreferences();

    const [overlay, setOverlay] = useState<SocialAIPreference | undefined>(
      undefined,
    );
    const [persistError, setPersistError] = useState<string | null>(null);

    const remoteSocialAI: SocialAIPreference =
      storagePreferences?.socialAI ?? DEFAULT_SOCIAL_AI;
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

    const enqueuePersist = useCallback(
      (nextSocialAI: SocialAIPreference) => {
        const next = writeChainRef.current.then(async () => {
          await updatePreferencesSection('socialAI', nextSocialAI);
        });
        // Swallow the chain's error so one failure doesn't jam subsequent
        // writes. The returned promise still rejects for the caller.
        writeChainRef.current = next.catch(() => undefined);
        return next;
      },
      [updatePreferencesSection],
    );

    const applyChange = useCallback(
      async (updater: (prev: SocialAIPreference) => SocialAIPreference) => {
        if (!hasNotificationPreferences) {
          const err = new Error(
            'No notification preferences found when updating social AI preferences, enable notifications first',
          );
          Logger.error(err, 'useNotificationPreferences: persist skipped');
          setPersistError(toErrorMessage(err));
          return;
        }

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
      },
      [enqueuePersist, hasNotificationPreferences],
    );

    useEffect(() => {
      if (overlay && hasRemoteCaughtUp(overlay, remoteSocialAI)) {
        setOverlay(undefined);
      }
    }, [overlay, remoteSocialAI]);

    const setPushNotificationsEnabled = useCallback(
      (value: boolean) =>
        applyChange((prev) => ({
          ...prev,
          pushNotificationsEnabled: value,
        })),
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
      hasNotificationPreferences,
      isLoading,
      error,
      setPushNotificationsEnabled,
      setTxAmountLimit,
      toggleTraderNotification,
      isTraderNotificationEnabled,
    };
  };

export default useNotificationPreferences;
