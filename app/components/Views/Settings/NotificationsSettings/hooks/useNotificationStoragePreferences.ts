import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUserStorageServiceGetNotificationPreferencesAction } from '@metamask/authenticated-user-storage';
import {
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  resolveAgenticCliPreference,
  withAgenticCliDefaults,
} from '../../../../../util/notifications/agenticCliNotificationPreferences';
import Logger from '../../../../../util/Logger';
import {
  ensureNotificationPreferencesReady,
  mergeAndPersistNotificationPreferences,
  readNotificationPreferencesForUpdate,
} from '../../../../../util/notifications/ensureAgenticCliNotificationPreferencesMigrated';

const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;

type NotificationStoragePreferencesResult = Awaited<
  ReturnType<
    AuthenticatedUserStorageServiceGetNotificationPreferencesAction['handler']
  >
>;
export type NotificationStoragePreferences =
  NonNullable<NotificationStoragePreferencesResult>;
export type NotificationStoragePreferenceSection =
  keyof NotificationStoragePreferences;
export type NotificationStoragePreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

const readCachedPreferences = (
  queryClient: ReturnType<typeof useQueryClient>,
): NotificationStoragePreferences | null => {
  const cached = queryClient.getQueryData<NotificationStoragePreferences>([
    GET_ACTION,
  ]);
  return cached ? withAgenticCliDefaults(cached) : null;
};

export const useNotificationStoragePreferences = () => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<NotificationStoragePreferences | null>(() =>
    readCachedPreferences(queryClient),
  );
  const [isLoading, setIsLoading] = useState(data == null);
  const [error, setError] = useState<unknown>(null);

  const syncPreferencesFromCache = useCallback(() => {
    const cachedPreferences = readCachedPreferences(queryClient);
    if (cachedPreferences) {
      setData(cachedPreferences);
    }
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') {
        return;
      }

      if (event.query.queryKey[0] !== GET_ACTION) {
        return;
      }

      syncPreferencesFromCache();
    });

    return unsubscribe;
  }, [queryClient, syncPreferencesFromCache]);

  useEffect(() => {
    let isActive = true;

    const loadPreferences = async () => {
      const cachedPreferences = readCachedPreferences(queryClient);
      if (cachedPreferences) {
        if (isActive) {
          setData(cachedPreferences);
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isActive) {
          setIsLoading(true);
          setError(null);
        }

        await ensureNotificationPreferencesReady();
        const preferences = await readNotificationPreferencesForUpdate();

        if (!isActive || preferences == null) {
          return;
        }

        const normalizedPreferences = withAgenticCliDefaults(preferences);
        queryClient.setQueryData([GET_ACTION], normalizedPreferences);
        setData(normalizedPreferences);
      } catch (loadError) {
        if (isActive) {
          setError(loadError);
          Logger.error(
            loadError as Error,
            'Failed to load notification preferences',
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadPreferences().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [queryClient]);

  const preferences = data;

  const enqueuePersist = useCallback(
    async <
      PreferenceType extends
        NotificationStoragePreferenceSection = NotificationStoragePreferenceSection,
    >(
      nextPreferences: NotificationStoragePreferences,
      updatedType?: PreferenceType,
    ): Promise<NotificationStoragePreferences> => {
      const updates: Partial<NotificationStoragePreferences> = updatedType
        ? { [updatedType]: nextPreferences[updatedType] }
        : nextPreferences;

      return mergeAndPersistNotificationPreferences(updates);
    },
    [],
  );

  const updatePreferencesSection = useCallback(
    async <PreferenceType extends NotificationStoragePreferenceSection>(
      type: PreferenceType,
      nextSectionPreferences: NotificationStoragePreferences[PreferenceType],
    ) => {
      const currentData = data ?? readCachedPreferences(queryClient);
      if (!currentData) {
        Logger.error(
          new Error(
            `No notification preferences found when updating ${type} section, enable notifications first`,
          ),
        );
        return;
      }

      const nextPreferences = withAgenticCliDefaults({
        ...currentData,
        [type]: nextSectionPreferences,
      });

      setData(nextPreferences);
      queryClient.setQueryData([GET_ACTION], nextPreferences);

      try {
        const persistedPreferences = await enqueuePersist(
          nextPreferences,
          type,
        );
        setData(persistedPreferences);
        queryClient.setQueryData([GET_ACTION], persistedPreferences);
      } catch (err) {
        const restoredPreferences =
          await readNotificationPreferencesForUpdate();
        if (restoredPreferences) {
          const normalized = withAgenticCliDefaults(restoredPreferences);
          setData(normalized);
          queryClient.setQueryData([GET_ACTION], normalized);
        }
        throw err;
      }
    },
    [data, enqueuePersist, queryClient],
  );

  const updatePreference = useCallback(
    async (
      type: NotificationStoragePreferenceSection,
      key: NotificationStoragePreferenceChannelKey,
      value: boolean,
    ) => {
      const currentData = data ?? readCachedPreferences(queryClient);
      if (!currentData) {
        Logger.error(
          new Error(
            'No notification preferences found when updating preference, enable notifications first',
          ),
        );
        return;
      }

      const currentSectionPreferences =
        type === AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION
          ? resolveAgenticCliPreference(currentData)
          : currentData[type];

      await updatePreferencesSection(type, {
        ...currentSectionPreferences,
        [key]: value,
      });
    },
    [data, queryClient, updatePreferencesSection],
  );

  return {
    preferences,
    hasNotificationPreferences:
      preferences !== null && preferences !== undefined,
    isLoading,
    error,
    updatePreference,
    updatePreferencesSection,
    syncPreferencesFromCache,
  };
};
