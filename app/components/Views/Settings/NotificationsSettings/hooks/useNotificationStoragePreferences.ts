import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type {
  AuthenticatedUserStorageServiceGetNotificationPreferencesAction,
  NotificationPreferences as NotificationPreferencesType,
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
// make agenticCli required
type NotificationPreferences = Omit<NotificationPreferencesType, 'agenticCli'> &
  Required<Pick<NotificationPreferencesType, 'agenticCli'>>;
export type NotificationPreferenceSection = keyof NotificationPreferences;
export type NotificationPreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';
type NotificationPreferenceSectionUpdater<
  PreferenceType extends NotificationPreferenceSection,
> = (
  currentSectionPreferences: NotificationPreferences[PreferenceType],
) => NotificationPreferences[PreferenceType];
type NotificationPreferenceSectionUpdate<
  PreferenceType extends NotificationPreferenceSection,
> =
  | NotificationPreferences[PreferenceType]
  | NotificationPreferenceSectionUpdater<PreferenceType>;

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
    sectionUpdate: NotificationPreferenceSectionUpdate<PreferenceType>,
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
    const [pendingWrites, setPendingWrites] = useState(0);
    const pendingWritesRef = useRef(0);
    const writeChainRef = useRef<Promise<void>>(Promise.resolve());
    const generationRef = useRef(0);
    const lastConfirmedPreferencesRef =
      useRef<NotificationPreferencesQueryData>(undefined);
    const getCachedPreferences = useCallback(
      () =>
        queryClient.getQueryData(QUERY_KEY) as NotificationPreferencesQueryData,
      [queryClient],
    );

    useEffect(() => {
      if (pendingWritesRef.current === 0 && data) {
        lastConfirmedPreferencesRef.current = data;
      }
    }, [data]);

    const beginWrite = useCallback(() => {
      pendingWritesRef.current += 1;
      setPendingWrites(pendingWritesRef.current);
    }, []);

    const finishWrite = useCallback(() => {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      setPendingWrites(pendingWritesRef.current);
    }, []);

    const updatePreferencesSection = useCallback(
      async <PreferenceType extends NotificationPreferenceSection>(
        type: PreferenceType,
        sectionUpdate: NotificationPreferenceSectionUpdate<PreferenceType>,
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

        const currentPreferences =
          latestCachedPreferences as NotificationPreferences;
        const currentSectionPreferences = currentPreferences[type];
        const nextSectionPreferences =
          typeof sectionUpdate === 'function'
            ? sectionUpdate(currentSectionPreferences)
            : sectionUpdate;

        if (nextSectionPreferences === currentSectionPreferences) {
          return;
        }

        const previousSnapshot = getCachedPreferences() ?? currentPreferences;
        const nextPreferences: NotificationPreferences = {
          ...currentPreferences,
          [type]: nextSectionPreferences,
        };

        if (pendingWritesRef.current === 0) {
          lastConfirmedPreferencesRef.current = previousSnapshot;
        }

        generationRef.current += 1;
        const writeGeneration = generationRef.current;
        beginWrite();

        const cancelQueriesPromise = queryClient.cancelQueries({
          queryKey: QUERY_KEY,
        });
        queryClient.setQueryData<NotificationPreferencesQueryData>(
          QUERY_KEY,
          nextPreferences,
        );

        const persistWrite = writeChainRef.current.then(async () => {
          await cancelQueriesPromise;
          await Engine.controllerMessenger.call(
            PUT_ACTION,
            nextPreferences,
            CLIENT_TYPE,
          );
        });
        writeChainRef.current = persistWrite.catch(() => undefined);

        try {
          await persistWrite;
          lastConfirmedPreferencesRef.current = nextPreferences;
        } catch (err) {
          Logger.error(
            err as Error,
            'Failed to persist notification preferences',
          );
          if (generationRef.current === writeGeneration) {
            queryClient.setQueryData<NotificationPreferencesQueryData>(
              QUERY_KEY,
              lastConfirmedPreferencesRef.current ?? previousSnapshot,
            );
          }
          throw err;
        } finally {
          finishWrite();
        }
      },
      [beginWrite, data, finishWrite, getCachedPreferences, queryClient],
    );

    const updateSectionChannel = useCallback(
      async (
        type: NotificationPreferenceSection,
        key: NotificationPreferenceChannelKey,
        value: boolean,
      ) => {
        await updatePreferencesSection(type, (currentSectionPreferences) => {
          if (currentSectionPreferences[key] === value) {
            return currentSectionPreferences;
          }

          return {
            ...currentSectionPreferences,
            [key]: value,
          };
        });
      },
      [updatePreferencesSection],
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
      isUpdatingPreferences: pendingWrites > 0,
      error,
      updatePreference,
      updateSectionChannel,
      updatePreferencesSection,
      refetch,
    };
  };
