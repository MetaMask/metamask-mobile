import { useQuery } from '@tanstack/react-query';
import { getSessionProfileId } from '../utils/get-session-profile-id';

const SESSION_PROFILE_ID_QUERY_KEY = ['notifications', 'sessionProfileId'];

interface UseSessionProfileIdResult {
  profileId: string | undefined;
  isLoading: boolean;
}

/** React Query wrapper for {@link getSessionProfileId} (cached/deduped); `profileId` is `undefined` while resolving, signed out, or on error. */
export function useSessionProfileId(): UseSessionProfileIdResult {
  const { data: profileId, isLoading } = useQuery({
    queryKey: SESSION_PROFILE_ID_QUERY_KEY,
    queryFn: async () => (await getSessionProfileId()) ?? null,
  });

  return { profileId: profileId ?? undefined, isLoading };
}
