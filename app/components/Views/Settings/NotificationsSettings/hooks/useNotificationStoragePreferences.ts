import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import type {
  AuthenticatedUserStorageServiceGetNotificationPreferencesAction,
  NotificationPreferences as NotificationPreferencesType,
} from '@metamask/authenticated-user-storage';
import type { NotificationPreferencesUpdate } from '@metamask/notification-services-controller/notification-services';
import Engine from '../../../../../core/Engine';
import { updateNotificationPreferences } from '../../../../../actions/notification/helpers';
import Logger from '../../../../../util/Logger';
import { selectAiSocialAusCacheRefreshEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';

const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
// Tells the social API to re-read this user's preferences from AUS and refresh
// its cache so the change is honoured near-instantly (see @metamask/social-controllers).
const REFRESH_SOCIAL_CACHE_ACTION =
  'SocialService:refreshNotificationPreferencesCache' as const;

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

/**
 * Returns the fields of a section that changed, so an update never sends back
 * fields it didn't change. Arrays and objects count as changed when replaced.
 *
 * @param current - The section before the change.
 * @param next - The section after the change.
 * @returns The changed fields.
 */
const getChangedFields = <Section extends object>(
  current: Section | undefined,
  next: Section,
): Partial<Section> =>
  Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => current?.[key as keyof Section] !== value,
    ),
  ) as Partial<Section>;

export const useNotificationStoragePreferences =
  (): UseNotificationStoragePreferencesResult => {
    const { data, isLoading, error, refetch } =
      useQuery<NotificationPreferencesResult>({
        queryKey: QUERY_KEY,
        refetchOnWindowFocus: false,
      });
    const isSocialCacheRefreshEnabled = useSelector(
      selectAiSocialAusCacheRefreshEnabled,
    );
    const queryClient = useQueryClient();
    const [pendingWrites, setPendingWrites] = useState(0);
    const pendingWritesRef = useRef(0);
    const writeSequenceRef = useRef(0);
    // What NotificationServicesController saved last, and whether any update
    // failed, since the last time no update was pending.
    const lastSavedPreferencesRef = useRef<NotificationPreferences | null>(
      null,
    );
    const lastSavedSequenceRef = useRef(0);
    const hadFailedWriteRef = useRef(false);
    const getCachedPreferences = useCallback(
      () =>
        queryClient.getQueryData(QUERY_KEY) as NotificationPreferencesQueryData,
      [queryClient],
    );

    const beginWrite = useCallback(() => {
      pendingWritesRef.current += 1;
      setPendingWrites(pendingWritesRef.current);
    }, []);

    // Once the last pending update settles, show what was saved. Doing it
    // earlier would hide changes still queued. If any update failed, re-read
    // instead: NotificationServicesController either saves an update or
    // leaves the preferences unchanged.
    const finishWrite = useCallback(() => {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
      setPendingWrites(pendingWritesRef.current);
      if (pendingWritesRef.current > 0) {
        return;
      }
      if (hadFailedWriteRef.current) {
        queryClient
          .invalidateQueries({ queryKey: QUERY_KEY })
          .catch((refetchError: unknown) =>
            Logger.error(
              refetchError as Error,
              'Failed to refresh notification preferences',
            ),
          );
      } else if (lastSavedPreferencesRef.current) {
        queryClient.setQueryData<NotificationPreferencesQueryData>(
          QUERY_KEY,
          lastSavedPreferencesRef.current,
        );
      }
      hadFailedWriteRef.current = false;
      lastSavedPreferencesRef.current = null;
    }, [queryClient]);

    const updatePreferencesSection = useCallback(
      async <PreferenceType extends NotificationPreferenceSection>(
        type: PreferenceType,
        sectionUpdate: NotificationPreferenceSectionUpdate<PreferenceType>,
      ) => {
        const currentPreferences = (getCachedPreferences() ?? data) as
          | NotificationPreferences
          | null
          | undefined;

        if (!currentPreferences) {
          Logger.error(
            new Error(
              `No notification preferences found when updating ${type} section, enable notifications first`,
            ),
          );
          return;
        }

        const currentSectionPreferences = currentPreferences[type];
        const nextSectionPreferences =
          typeof sectionUpdate === 'function'
            ? sectionUpdate(currentSectionPreferences)
            : sectionUpdate;
        const changedFields = getChangedFields(
          currentSectionPreferences,
          nextSectionPreferences,
        );

        if (Object.keys(changedFields).length === 0) {
          return;
        }

        // Show the change straight away; NotificationServicesController
        // queues updates and merges each one over the stored preferences. The
        // cache update must not wait, so a quick second toggle reads it.
        writeSequenceRef.current += 1;
        const sequence = writeSequenceRef.current;
        beginWrite();
        queryClient
          .cancelQueries({ queryKey: QUERY_KEY })
          .catch((cancelError: unknown) =>
            Logger.error(cancelError as Error, 'Failed to cancel query'),
          );
        queryClient.setQueryData<NotificationPreferencesQueryData>(
          QUERY_KEY,
          (current) =>
            current
              ? {
                  ...current,
                  [type]: { ...current[type], ...changedFields },
                }
              : current,
        );

        try {
          const saved = await updateNotificationPreferences({
            [type]: changedFields,
          } as NotificationPreferencesUpdate);
          // Keep the result of the latest update, whatever order they settle
          // in.
          if (sequence > lastSavedSequenceRef.current) {
            lastSavedSequenceRef.current = sequence;
            lastSavedPreferencesRef.current = saved as NotificationPreferences;
          }
          // Best-effort: nudge the Social API to refresh its cached copy so
          // the change is honoured immediately rather than after its cache
          // TTL. Gated behind the aiSocialAusCacheRefreshEnabled flag so it
          // only runs once the Social API cache-refresh endpoint is rolled out.
          // Fire-and-forget — the AUS write above is the source of truth and
          // has already succeeded, so a failure here must not roll back the
          // change or surface to the user, hence the swallowed catch.
          if (isSocialCacheRefreshEnabled) {
            Engine.controllerMessenger
              .call(REFRESH_SOCIAL_CACHE_ACTION)
              .catch((refreshError) => {
                Logger.error(
                  refreshError as Error,
                  'Failed to refresh Social API notification preferences cache',
                );
              });
          }
        } catch (err) {
          Logger.error(
            err as Error,
            'Failed to persist notification preferences',
          );
          hadFailedWriteRef.current = true;
          throw err;
        } finally {
          finishWrite();
        }
      },
      [
        beginWrite,
        data,
        finishWrite,
        getCachedPreferences,
        isSocialCacheRefreshEnabled,
        queryClient,
      ],
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
