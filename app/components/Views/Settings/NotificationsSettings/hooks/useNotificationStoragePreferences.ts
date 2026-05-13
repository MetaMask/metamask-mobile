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

type NotificationStoragePreferencesResponse = Awaited<
  ReturnType<
    AuthenticatedUserStorageServiceGetNotificationPreferencesAction['handler']
  >
>;
export type NotificationStoragePreferences =
  NonNullable<NotificationStoragePreferencesResponse>;
export type NotificationStoragePreferenceType =
  keyof NotificationStoragePreferences;
export type NotificationStoragePreferenceKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

export const useNotificationStoragePreferences = () => {
  const selectedAccountId =
    useSelector(selectSelectedInternalAccountId) ?? 'anonymous';

  const { data, isLoading, error, refetch } =
    useQuery<NotificationStoragePreferencesResponse>({
      queryKey: [GET_ACTION, selectedAccountId],
    });
  const queryClient = useQueryClient();

  const enqueuePersist = useCallback(
    async (nextPreferences: NotificationStoragePreferences) => {
      try {
        const latest = await Engine.controllerMessenger.call(GET_ACTION);
        const preferencesToPersist: NotificationStoragePreferences = {
          ...(latest ?? nextPreferences),
          ...nextPreferences,
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

  const updatePreference = useCallback(
    async (
      type: NotificationStoragePreferenceType,
      key: NotificationStoragePreferenceKey,
      value: boolean,
    ) => {
      if (!data) {
        Logger.error(
          new Error('No notification preferences found, enable notifications first'),
        );
        return;
      }

      const nextPreferences = {
        ...data,
        [type]: {
          ...data[type],
          [key]: value,
        },
      };

      queryClient.setQueryData<NotificationStoragePreferencesResponse>(
        [GET_ACTION, selectedAccountId],
        nextPreferences,
      );

      try {
        await enqueuePersist(nextPreferences);
      } catch (err) {
        refetch();
      }
    },
    [data, enqueuePersist, queryClient, selectedAccountId, refetch],
  );

  return {
    preferences: data,
    isLoading,
    error,
    updatePreference,
  };
};
