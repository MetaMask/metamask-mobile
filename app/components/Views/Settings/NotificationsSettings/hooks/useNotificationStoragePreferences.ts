import { useCallback, useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUserStorageServiceGetNotificationPreferencesAction } from '@metamask/authenticated-user-storage';
import {
  AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION,
  resolveAgenticCliPreference,
  setClientAgenticCliPreferenceOverride,
  type NotificationStoragePreferencesWithAgenticCli,
} from '../../../../../util/notifications/agenticCliNotificationPreferences';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

const CLIENT_TYPE = 'mobile' as const;
const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

type NotificationStoragePreferencesResult = Awaited<
  ReturnType<
    AuthenticatedUserStorageServiceGetNotificationPreferencesAction['handler']
  >
>;
export type NotificationStoragePreferences =
  NotificationStoragePreferencesWithAgenticCli;
export type NotificationStoragePreferenceSection =
  keyof NotificationStoragePreferences;
export type NotificationStoragePreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

const withResolvedAgenticCliPreferences = (
  preferences: NotificationStoragePreferencesResult | undefined,
): NotificationStoragePreferencesResult | undefined => {
  if (!preferences) {
    return preferences;
  }

  return {
    ...preferences,
    [AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION]:
      resolveAgenticCliPreference(preferences),
  };
};

export const useNotificationStoragePreferences = () => {
  const { data, isLoading, error, refetch } =
    useQuery<NotificationStoragePreferencesResult>({
      queryKey: [GET_ACTION],
    });
  const queryClient = useQueryClient();

  const preferences = useMemo(
    () => withResolvedAgenticCliPreferences(data),
    [data],
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
        const latest = await Engine.controllerMessenger.call(GET_ACTION);
        const preferencesToPersist: NotificationStoragePreferences = {
          ...(latest ?? nextPreferences),
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

      const nextPreferences = {
        ...data,
        [type]: nextSectionPreferences,
      } as NotificationStoragePreferences;

      if (type === AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION) {
        setClientAgenticCliPreferenceOverride(nextSectionPreferences);
      }

      queryClient.setQueryData<NotificationStoragePreferencesResult>(
        [GET_ACTION],
        (previousPreferences) =>
          withResolvedAgenticCliPreferences({
            ...(previousPreferences ?? nextPreferences),
            [type]: nextSectionPreferences,
          } as NotificationStoragePreferences) as NotificationStoragePreferences,
      );

      try {
        await enqueuePersist(nextPreferences, type);
      } catch (err) {
        if (type === AGENTIC_CLI_NOTIFICATION_PREFERENCE_SECTION) {
          setClientAgenticCliPreferenceOverride(null);
        }
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
          ? resolveAgenticCliPreference(data)
          : data[type];

      await updatePreferencesSection(type, {
        ...currentSectionPreferences,
        [key]: value,
      });
    },
    [data, updatePreferencesSection],
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
