import { useQuery } from '@tanstack/react-query';
import { getSocialProfileId } from './getSocialProfileId';

const SOCIAL_PROFILE_ID_QUERY_KEY = ['social', 'canonicalProfileId'];

interface UseSocialProfileIdResult {
  profileId: string | undefined;
  isLoading: boolean;
}

/** React Query wrapper for {@link getSocialProfileId} (cached/deduped); `profileId` is `undefined` while resolving, signed out, or on error. */
export function useSocialProfileId(): UseSocialProfileIdResult {
  const { data: profileId, isLoading } = useQuery({
    queryKey: SOCIAL_PROFILE_ID_QUERY_KEY,
    queryFn: async () => (await getSocialProfileId()) ?? null,
  });

  return { profileId: profileId ?? undefined, isLoading };
}
