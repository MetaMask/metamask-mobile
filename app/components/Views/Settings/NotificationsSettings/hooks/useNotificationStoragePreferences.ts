import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY,
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  mergeAgenticCliIntoPreferences,
  persistLocalAgenticCliPreference,
  readAgenticCliFromPreferences,
  resolveAgenticCliPreference,
  stripAgenticCliFromNotificationPreferences,
  type AgenticCliPreference,
  type NotificationStoragePreferencesWithAgenticCli,
} from '../../../../../util/notifications/agenticCliNotificationPreferences';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { useAgenticCliClientPreference } from './useAgenticCliClientPreference';

const CLIENT_TYPE = 'mobile' as const;
const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

export { AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY };

export type NotificationStoragePreferences =
  NotificationStoragePreferencesWithAgenticCli;
export type NotificationStoragePreferenceSection =
  keyof NotificationStoragePreferences;
export type NotificationStoragePreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

export const useNotificationStoragePreferences = () => {
  const { data, isLoading, error, refetch } = useQuery<
    NotificationStoragePreferences | undefined
  >({
    queryKey: [GET_ACTION],
  });
  const queryClient = useQueryClient();
  const clientAgenticCliPreference = useAgenticCliClientPreference(queryClient);

  useEffect(() => {
    if (!data) {
      queryClient.removeQueries({
        queryKey: AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY,
      });
      return;
    }

    if (readAgenticCliFromPreferences(data)) {
      queryClient.removeQueries({
        queryKey: AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY,
      });
    }
  }, [data, queryClient]);

  const preferences = useMemo(() => {
    if (!data) {
      return data;
    }

    const cached = queryClient.getQueryData<NotificationStoragePreferences>([
      GET_ACTION,
    ]);

    return mergeAgenticCliIntoPreferences(
      data,
      cached,
      clientAgenticCliPreference,
    );
  }, [clientAgenticCliPreference, data, queryClient]);

  const setAgenticCliClientPreference = useCallback(
    (preference: AgenticCliPreference) => {
      persistLocalAgenticCliPreference(preference);
      queryClient.setQueryData<AgenticCliPreference>(
        AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY,
        preference,
      );
    },
    [queryClient],
  );

  const setApiPreferencesCache = useCallback(
    (nextPreferences: NotificationStoragePreferences) => {
      queryClient.setQueryData(
        [GET_ACTION],
        stripAgenticCliFromNotificationPreferences(nextPreferences),
      );
    },
    [queryClient],
  );

  const enqueuePersist = useCallback(
    async <
      PreferenceType extends
        NotificationStoragePreferenceSection = NotificationStoragePreferenceSection,
    >(
      nextPreferences: NotificationStoragePreferences,
      updatedType?: PreferenceType,
    ) => {
      try {
        const latest = (await Engine.controllerMessenger.call(
          GET_ACTION,
        )) as NotificationStoragePreferences | null;
        const preferencesToPersist: NotificationStoragePreferences = {
          ...mergeAgenticCliIntoPreferences(
            latest ?? nextPreferences,
            nextPreferences,
            clientAgenticCliPreference,
          ),
          ...(updatedType
            ? { [updatedType]: nextPreferences[updatedType] }
            : nextPreferences),
        };

        await Engine.controllerMessenger.call(
          PUT_ACTION,
          preferencesToPersist,
          CLIENT_TYPE,
        );

        setApiPreferencesCache(preferencesToPersist);

        if (preferencesToPersist[AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION]) {
          setAgenticCliClientPreference(
            preferencesToPersist[AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION],
          );
        }

        return preferencesToPersist;
      } catch (err) {
        Logger.error(
          err as Error,
          'Failed to persist notification preferences',
        );
        throw err;
      }
    },
    [
      clientAgenticCliPreference,
      setAgenticCliClientPreference,
      setApiPreferencesCache,
    ],
  );

  const updatePreferencesSection = useCallback(
    async <PreferenceType extends NotificationStoragePreferenceSection>(
      type: PreferenceType,
      nextSectionPreferences: NotificationStoragePreferences[PreferenceType],
    ) => {
      if (!data) {
        Logger.error(
          new Error(
            `No notification preferences found when updating ${type} section, enable notifications first`,
          ),
        );
        return;
      }

      const mergedCurrent = mergeAgenticCliIntoPreferences(
        data,
        queryClient.getQueryData<NotificationStoragePreferences>([GET_ACTION]),
        clientAgenticCliPreference,
      );

      const nextPreferences: NotificationStoragePreferences = {
        ...mergedCurrent,
        [type]: nextSectionPreferences,
      };

      if (type === AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION) {
        setAgenticCliClientPreference(
          nextSectionPreferences as AgenticCliPreference,
        );
      }

      setApiPreferencesCache(nextPreferences);

      try {
        await enqueuePersist(nextPreferences, type);
      } catch (err) {
        refetch();
        throw err;
      }
    },
    [
      clientAgenticCliPreference,
      data,
      enqueuePersist,
      queryClient,
      refetch,
      setAgenticCliClientPreference,
      setApiPreferencesCache,
    ],
  );

  const updatePreference = useCallback(
    async (
      type: NotificationStoragePreferenceSection,
      key: NotificationStoragePreferenceChannelKey,
      value: boolean,
    ) => {
      if (!data) {
        Logger.error(
          new Error(
            'No notification preferences found when updating preference, enable notifications first',
          ),
        );
        return;
      }

      const currentSectionPreferences =
        type === AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION
          ? resolveAgenticCliPreference(
              mergeAgenticCliIntoPreferences(
                data,
                queryClient.getQueryData<NotificationStoragePreferences>([
                  GET_ACTION,
                ]),
                clientAgenticCliPreference,
              ),
            )
          : data[type];

      await updatePreferencesSection(type, {
        ...currentSectionPreferences,
        [key]: value,
      });
    },
    [clientAgenticCliPreference, data, queryClient, updatePreferencesSection],
  );

  return {
    preferences,
    hasNotificationPreferences:
      preferences !== null && preferences !== undefined,
    isLoading,
    error,
    updatePreference,
    updatePreferencesSection,
  };
};
