import { useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY,
  type AgenticCliPreference,
} from '../../../../../util/notifications/agenticCliNotificationPreferences';

/**
 * Subscribes to the React Query cache entry for client-side `agenticCli`
 * preferences so every screen using notification preferences re-renders when
 * the detail screen updates toggles (separate hook instances otherwise stay stale).
 */
export const useAgenticCliClientPreference = (
  queryClient: QueryClient,
): AgenticCliPreference | undefined =>
  useSyncExternalStore(
    (onStoreChange) => queryClient.getQueryCache().subscribe(onStoreChange),
    () =>
      queryClient.getQueryData<AgenticCliPreference>([
        ...AGENTIC_CLI_CLIENT_PREFERENCE_QUERY_KEY,
      ]),
    () => undefined,
  );
