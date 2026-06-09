import { useCallback } from 'react';
import { useQuery } from '@metamask/react-data-query';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedUserStorageServiceGetNotificationPreferencesAction } from '@metamask/authenticated-user-storage';
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
  NonNullable<NotificationStoragePreferencesResult>;
export type NotificationStoragePreferenceSection =
  keyof NotificationStoragePreferences;
export type NotificationStoragePreferenceChannelKey =
  | 'pushNotificationsEnabled'
  | 'inAppNotificationsEnabled';

export interface UseNotificationStoragePreferencesResult {
  preferences: NotificationStoragePreferencesResult;
  hasNotificationPreferences: boolean;
  isLoading: boolean;
  error: unknown;
  updatePreference: (
    type: NotificationStoragePreferenceSection,
    key: NotificationStoragePreferenceChannelKey,
    value: boolean,
  ) => Promise<void>;
  updateSectionChannel: (
    type: NotificationStoragePreferenceSection,
    key: NotificationStoragePreferenceChannelKey,
    value: boolean,
  ) => Promise<void>;
  updatePreferencesSection: <PreferenceType extends NotificationStoragePreferenceSection>(
    type: PreferenceType,
    nextSectionPreferences: NotificationStoragePreferences[PreferenceType],
  ) => Promise<void>;
  refetch: () => Promise<unknown>;
}

const QUERY_KEY = [GET_ACTION] as const;
const RECONCILIATION_DELAY_MS = 60_000;

let pendingWrites = 0;
let writeChain: Promise<void> = Promise.resolve();
let suppressAutoRefetchUntil = 0;
let reconcileTimer: ReturnType<typeof setTimeout> | undefined;
const sectionGenerations: Partial<
  Record<NotificationStoragePreferenceSection, number>
> = {};

const shouldAllowAutomaticRefetch = () =>
  pendingWrites === 0 && Date.now() >= suppressAutoRefetchUntil;

const enqueueWrite = (task: () => Promise<void>) => {
  const next = writeChain.then(task);
  // Keep the chain alive after failures so future writes are not blocked.
  writeChain = next.catch(() => undefined);
  return next;
};

const scheduleIdleReconcile = (queryClient: QueryClient) => {
  if (reconcileTimer) {
    clearTimeout(reconcileTimer);
  }

  const delay = Math.max(suppressAutoRefetchUntil - Date.now(), 0);
  reconcileTimer = setTimeout(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, delay);
};

export const __resetNotificationStoragePreferencesModuleState = () => {
  pendingWrites = 0;
  writeChain = Promise.resolve();
  suppressAutoRefetchUntil = 0;
  if (reconcileTimer) {
    clearTimeout(reconcileTimer);
    reconcileTimer = undefined;
  }
  (Object.keys(sectionGenerations) as NotificationStoragePreferenceSection[]).forEach(
    (key) => {
      delete sectionGenerations[key];
    },
  );
};

export const useNotificationStoragePreferences =
  (): UseNotificationStoragePreferencesResult => {
  const { data, isLoading, error, refetch } =
    useQuery<NotificationStoragePreferencesResult>({
      queryKey: QUERY_KEY,
      refetchOnMount: () => shouldAllowAutomaticRefetch(),
      refetchOnWindowFocus: () => shouldAllowAutomaticRefetch(),
    });
  const queryClient = useQueryClient();

  const updatePreferencesSection = useCallback(
    async <PreferenceType extends NotificationStoragePreferenceSection>(
      type: PreferenceType,
      nextSectionPreferences: NotificationStoragePreferences[PreferenceType],
    ) => {
      const latestCachedPreferences =
        queryClient.getQueryData<NotificationStoragePreferencesResult>(
          QUERY_KEY,
        ) ?? data;

      if (!latestCachedPreferences) {
        Logger.error(
          new Error(
            `No notification preferences found when updating ${type} section, enable notifications first`,
          ),
        );
        return;
      }

      const previousSnapshot =
        queryClient.getQueryData<NotificationStoragePreferencesResult>(
          QUERY_KEY,
        ) ?? latestCachedPreferences;
      const optimisticPreferences: NotificationStoragePreferences = {
        ...(latestCachedPreferences as NotificationStoragePreferences),
        [type]: nextSectionPreferences,
      };

      sectionGenerations[type] = (sectionGenerations[type] ?? 0) + 1;
      const myGeneration = sectionGenerations[type];
      pendingWrites += 1;
      // The backing storage service has internal caching; avoid stale refetches
      // overriding optimistic values until writes settle and reconciliation runs.
      suppressAutoRefetchUntil = Date.now() + RECONCILIATION_DELAY_MS;

      const cancelQueriesPromise = queryClient.cancelQueries({
        queryKey: QUERY_KEY,
      });
      queryClient.setQueryData<NotificationStoragePreferencesResult>(
        QUERY_KEY,
        (currentPreferences) => {
          const currentBase =
            (currentPreferences ?? latestCachedPreferences) as NotificationStoragePreferences;
          return {
            ...currentBase,
            [type]: nextSectionPreferences,
          } as NotificationStoragePreferences;
        },
      );

      try {
        await cancelQueriesPromise;
        await enqueueWrite(async () => {
          const preferencesToPersist =
            (queryClient.getQueryData<NotificationStoragePreferencesResult>(
              QUERY_KEY,
            ) ?? optimisticPreferences) as NotificationStoragePreferences;

          await Engine.controllerMessenger.call(
            PUT_ACTION,
            preferencesToPersist,
            CLIENT_TYPE,
          );
        });
      } catch (err) {
        Logger.error(err as Error, 'Failed to persist notification preferences');
        if (sectionGenerations[type] === myGeneration) {
          queryClient.setQueryData<NotificationStoragePreferencesResult>(
            QUERY_KEY,
            previousSnapshot,
          );
        }
        throw err;
      } finally {
        pendingWrites = Math.max(0, pendingWrites - 1);
        if (pendingWrites === 0) {
          scheduleIdleReconcile(queryClient);
        }
      }
    },
    [data, queryClient],
  );

  const updateSectionChannel = useCallback(
    async (
      type: NotificationStoragePreferenceSection,
      key: NotificationStoragePreferenceChannelKey,
      value: boolean,
    ) => {
      const latestCachedPreferences =
        queryClient.getQueryData<NotificationStoragePreferencesResult>(
          QUERY_KEY,
        ) ?? data;

      if (!latestCachedPreferences) {
        Logger.error(
          new Error(
            'No notification preferences found when updating preference, enable notifications first',
          ),
        );
        return;
      }

      if (latestCachedPreferences[type][key] === value) {
        return;
      }

      await updatePreferencesSection(type, {
        ...latestCachedPreferences[type],
        [key]: value,
      });
    },
    [data, queryClient, updatePreferencesSection],
  );

  const updatePreference = useCallback(
    async (
      type: NotificationStoragePreferenceSection,
      key: NotificationStoragePreferenceChannelKey,
      value: boolean,
    ) => {
      await updateSectionChannel(type, key, value);
    },
    [updateSectionChannel],
  );

  return {
    preferences: data as NotificationStoragePreferencesResult,
    hasNotificationPreferences: data !== null && data !== undefined,
    isLoading,
    error,
    updatePreference,
    updateSectionChannel,
    updatePreferencesSection,
    refetch,
  };
};
