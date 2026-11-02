import { useQuery } from '@tanstack/react-query';
import {
  getCanonicalSessionProfileId,
  getSessionProfileId,
} from '../utils/get-session-profile-id';

const SESSION_PROFILE_ID_QUERY_KEY = ['notifications', 'sessionProfileId'];
const CANONICAL_SESSION_PROFILE_ID_QUERY_KEY = [
  'notifications',
  'canonicalSessionProfileId',
];

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

/**
 * React Query wrapper for {@link getCanonicalSessionProfileId}.
 * Use this for profile API ownership (create/fetch). Notification and
 * rebate callers keep {@link useSessionProfileId}.
 */
export function useCanonicalSessionProfileId(): UseSessionProfileIdResult {
  const { data: profileId, isLoading } = useQuery({
    queryKey: CANONICAL_SESSION_PROFILE_ID_QUERY_KEY,
    queryFn: async () => (await getCanonicalSessionProfileId()) ?? null,
  });

  return { profileId: profileId ?? undefined, isLoading };
}
