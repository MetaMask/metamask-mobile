import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type {
  AuthenticatedUserStorageServiceGetNotificationPreferencesAction,
  NotificationPreferences,
} from '@metamask/authenticated-user-storage';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

const CLIENT_TYPE = 'mobile' as const;
const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

type NotificationPreferencesResult = Awaited<
  ReturnType<
    AuthenticatedUserStorageServiceGetNotificationPreferencesAction['handler']
  >
>;
type NotificationPreferencesQueryData =
  | NotificationPreferencesResult
  | undefined;
export type NotificationPreferenceSection = keyof NotificationPreferences;
export type NotificationPreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

export interface UseNotificationStoragePreferencesResult {
  preferences: NotificationPreferencesQueryData;
  hasNotificationPreferences: boolean;
  isLoading: boolean;
  isUpdatingPreferences: boolean;
  error: unknown;
  updatePreference: (
    type: NotificationPreferenceSection,
    key: NotificationPreferenceChannelKey,
    value: boolean,
  ) => Promise<void>;
  updateSectionChannel: (
    type: NotificationPreferenceSection,
    key: NotificationPreferenceChannelKey,
    value: boolean,
  ) => Promise<void>;
  updatePreferencesSection: <
    PreferenceType extends NotificationPreferenceSection,
  >(
    type: PreferenceType,
    nextSectionPreferences: NotificationPreferences[PreferenceType],
  ) => Promise<void>;
  refetch: () => Promise<unknown>;
}

const QUERY_KEY: [typeof GET_ACTION] = [GET_ACTION];

export const useNotificationStoragePreferences =
  (): UseNotificationStoragePreferencesResult => {
    const { data, isLoading, error, refetch } =
      useQuery<NotificationPreferencesResult>({
        queryKey: QUERY_KEY,
        refetchOnWindowFocus: false,
      });
    const queryClient = useQueryClient();
    const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
    const isUpdatingPreferencesRef = useRef(false);
    const getCachedPreferences = useCallback(
      () =>
        queryClient.getQueryData(QUERY_KEY) as NotificationPreferencesQueryData,
      [queryClient],
    );

    const updatePreferencesSection = useCallback(
      async <PreferenceType extends NotificationPreferenceSection>(
        type: PreferenceType,
        nextSectionPreferences: NotificationPreferences[PreferenceType],
      ) => {
        const latestCachedPreferences = getCachedPreferences() ?? data;

        if (!latestCachedPreferences) {
          Logger.error(
            new Error(
              `No notification preferences found when updating ${type} section, enable notifications first`,
            ),
          );
          return;
        }

        if (isUpdatingPreferencesRef.current) {
          return;
        }

        const currentPreferences =
          latestCachedPreferences as NotificationPreferences;
        const previousSnapshot = getCachedPreferences() ?? currentPreferences;
        const nextPreferences: NotificationPreferences = {
          ...currentPreferences,
          [type]: nextSectionPreferences,
        };

        isUpdatingPreferencesRef.current = true;
        setIsUpdatingPreferences(true);
        try {
          await queryClient.cancelQueries({
            queryKey: QUERY_KEY,
          });
          queryClient.setQueryData<NotificationPreferencesQueryData>(
            QUERY_KEY,
            nextPreferences,
          );
          await Engine.controllerMessenger.call(
            PUT_ACTION,
            nextPreferences,
            CLIENT_TYPE,
          );
        } catch (err) {
          Logger.error(
            err as Error,
            'Failed to persist notification preferences',
          );
          queryClient.setQueryData<NotificationPreferencesQueryData>(
            QUERY_KEY,
            previousSnapshot,
          );
          throw err;
        } finally {
          isUpdatingPreferencesRef.current = false;
          setIsUpdatingPreferences(false);
        }
      },
      [data, getCachedPreferences, queryClient],
    );

    const updateSectionChannel = useCallback(
      async (
        type: NotificationPreferenceSection,
        key: NotificationPreferenceChannelKey,
        value: boolean,
      ) => {
        const latestCachedPreferences = getCachedPreferences() ?? data;

        if (!latestCachedPreferences) {
          Logger.error(
            new Error(
              'No notification preferences found when updating preference, enable notifications first',
            ),
          );
          return;
        }

        const currentPreferences =
          latestCachedPreferences as NotificationPreferences;

        if (currentPreferences[type][key] === value) {
          return;
        }

        await updatePreferencesSection(type, {
          ...currentPreferences[type],
          [key]: value,
        });
      },
      [data, getCachedPreferences, updatePreferencesSection],
    );

    const updatePreference = useCallback(
      async (
        type: NotificationPreferenceSection,
        key: NotificationPreferenceChannelKey,
        value: boolean,
      ) => {
        await updateSectionChannel(type, key, value);
      },
      [updateSectionChannel],
    );

    return {
      preferences: data as NotificationPreferencesResult,
      hasNotificationPreferences: data !== null && data !== undefined,
      isLoading,
      isUpdatingPreferences,
      error,
      updatePreference,
      updateSectionChannel,
      updatePreferencesSection,
      refetch,
    };
  };
