import { useQuery } from '@tanstack/react-query';
import { getSessionProfileId } from '../utils/get-session-profile-id';

const SESSION_PROFILE_ID_QUERY_KEY = ['notifications', 'sessionProfileId'];

interface UseSessionProfileIdResult {
  profileId: string | undefined;
  isLoading: boolean;
}

/**
 * React sister hook for {@link getSessionProfileId}.
 *
 * Resolves the current session's profile ID from the `AuthenticationController`
 * via React Query, so the result is cached and deduped across components and
 * the async lifecycle is managed for the caller.
 *
 * `profileId` is `undefined` while resolving, when signed out, or on any error
 * (the underlying util never throws).
 *
 * @returns the resolved session profile ID and whether it is still resolving.
 */
export function useSessionProfileId(): UseSessionProfileIdResult {
  const { data: profileId, isLoading } = useQuery({
    queryKey: SESSION_PROFILE_ID_QUERY_KEY,
    queryFn: async () => (await getSessionProfileId()) ?? null,
  });

  return { profileId: profileId ?? undefined, isLoading };
}
