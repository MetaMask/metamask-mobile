import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUserStorageServiceGetNotificationPreferencesAction } from '@metamask/authenticated-user-storage';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectSelectedInternalAccountId } from '../../../../../selectors/accountsController';

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
  NonNullable<NotificationStoragePreferencesResult>;
export type NotificationStoragePreferenceSection =
  keyof NotificationStoragePreferences;
export type NotificationStoragePreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

export const useNotificationStoragePreferences = () => {
  const selectedAccountId =
    useSelector(selectSelectedInternalAccountId) ?? 'anonymous';

  const { data, isLoading, error, refetch } =
    useQuery<NotificationStoragePreferencesResult>({
      queryKey: [GET_ACTION, selectedAccountId],
    });
  const queryClient = useQueryClient();

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

      queryClient.setQueryData<NotificationStoragePreferencesResult>(
        [GET_ACTION, selectedAccountId],
        (previousPreferences) =>
          ({
            ...(previousPreferences ?? nextPreferences),
            [type]: nextSectionPreferences,
          }) as NotificationStoragePreferences,
      );

      try {
        await enqueuePersist(nextPreferences, type);
      } catch (err) {
        refetch();
        throw err;
      }
    },
    [data, enqueuePersist, queryClient, selectedAccountId, refetch],
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

      await updatePreferencesSection(type, {
        ...data[type],
        [key]: value,
      });
    },
    [data, updatePreferencesSection],
  );

  return {
    preferences: data,
    hasNotificationPreferences: data !== null && data !== undefined,
    isLoading,
    error,
    updatePreference,
    updatePreferencesSection,
  };
};
