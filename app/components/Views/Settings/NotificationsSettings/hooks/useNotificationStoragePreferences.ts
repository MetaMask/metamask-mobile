import { useCallback, useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  mergeAgenticCliIntoPreferences,
  resolveAgenticCliPreference,
  type NotificationStoragePreferencesWithAgenticCli,
} from '../../../../../util/notifications/agenticCliNotificationPreferences';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

const CLIENT_TYPE = 'mobile' as const;
const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

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

  const preferences = useMemo(() => {
    if (!data) {
      return data;
    }

    const cached = queryClient.getQueryData<NotificationStoragePreferences>([
      GET_ACTION,
    ]);

    return mergeAgenticCliIntoPreferences(data, cached);
  }, [data, queryClient]);

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
          ...mergeAgenticCliIntoPreferences(latest ?? nextPreferences),
          ...(updatedType
            ? { [updatedType]: nextPreferences[updatedType] }
            : nextPreferences),
        };

        await Engine.controllerMessenger.call(
          PUT_ACTION,
          preferencesToPersist,
          CLIENT_TYPE,
        );
      } catch (err) {
        Logger.error(
          err as Error,
          'Failed to persist notification preferences',
        );
        throw err;
      }
    },
    [],
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

      const nextPreferences = mergeAgenticCliIntoPreferences({
        ...data,
        [type]: nextSectionPreferences,
      });

      queryClient.setQueryData<NotificationStoragePreferences>(
        [GET_ACTION],
        (previousPreferences) =>
          mergeAgenticCliIntoPreferences(
            {
              ...(previousPreferences ?? nextPreferences),
              [type]: nextSectionPreferences,
            },
            previousPreferences,
          ),
      );

      try {
        await enqueuePersist(nextPreferences, type);
      } catch (err) {
        refetch();
        throw err;
      }
    },
    [data, enqueuePersist, queryClient, refetch],
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
              ),
            )
          : data[type];

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
  };
};
