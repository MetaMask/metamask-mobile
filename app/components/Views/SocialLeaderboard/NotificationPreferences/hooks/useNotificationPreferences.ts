import { useCallback, useEffect, useState } from 'react';
import type { SocialAIPreference } from '@metamask/authenticated-user-storage';
import Logger from '../../../../../util/Logger';
import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
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
 * Notification preferences for the Top Traders feature, backed by
 * the shared notification preferences stored in
 * `AuthenticatedUserStorageService`.
 *
 * Optimistic updates and write serialization are centralized in
 * `useNotificationStoragePreferences`. This hook only derives the socialAI
 * slice and exposes Social Leaderboard specific mutators/selectors.
 */
export const useNotificationPreferences =
  (): UseNotificationPreferencesResult => {
    const {
      preferences: storagePreferences,
      hasNotificationPreferences,
      isLoading,
      error: queryError,
      updatePreferencesSection,
      updateSectionChannel,
    } = useNotificationStoragePreferences();

    const [persistError, setPersistError] = useState<string | null>(null);

    const socialAI: SocialAIPreference =
      storagePreferences?.socialAI ?? DEFAULT_SOCIAL_AI;

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

        setPersistError(null);

        try {
          await updatePreferencesSection('socialAI', (prev) =>
            updater(prev ?? getDefaultSocialAIPreferences()),
          );
        } catch (err) {
          Logger.error(
            err as Error,
            'useNotificationPreferences: persist failed',
          );
          setPersistError(toErrorMessage(err));
        }
      },
      [hasNotificationPreferences, updatePreferencesSection],
    );

    const setPushNotificationsEnabled = useCallback(
      async (value: boolean) => {
        if (!hasNotificationPreferences) {
          const err = new Error(
            'No notification preferences found when updating social AI preferences, enable notifications first',
          );
          Logger.error(err, 'useNotificationPreferences: persist skipped');
          setPersistError(toErrorMessage(err));
          return;
        }

        setPersistError(null);
        try {
          await updateSectionChannel(
            'socialAI',
            'pushNotificationsEnabled',
            value,
          );
        } catch (err) {
          Logger.error(
            err as Error,
            'useNotificationPreferences: persist failed',
          );
          setPersistError(toErrorMessage(err));
        }
      },
      [hasNotificationPreferences, updateSectionChannel],
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
