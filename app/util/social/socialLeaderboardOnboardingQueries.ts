import type { QueryClient } from '@tanstack/react-query';
import type { FetchLeaderboardOptions } from '@metamask/social-controllers';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ONBOARDING_TOP_TRADERS_LIMIT } from '../../components/Views/SocialLeaderboard/Onboarding/constants';

/**
 * Builds the exact `useTopTraders` query key the onboarding screen reads
 * (`SocialLeaderboardOnboarding.tsx`), so a prefetch here lands in the same
 * react-query cache entry the screen consumes. Must stay in sync with
 * `ONBOARDING_TOP_TRADERS_LIMIT` and the `chains` the onboarding screen passes
 * (`ALL_CHAINS`/`SPOT_CHAINS` by perps flag) — a mismatch would silently warm
 * the wrong cache entry and defeat the prefetch.
 */
export const buildOnboardingLeaderboardQueryKey = (
  chains: string[],
): [string, FetchLeaderboardOptions] => [
  'SocialService:fetchLeaderboard',
  { limit: ONBOARDING_TOP_TRADERS_LIMIT, chains },
];

/**
 * Warms the onboarding top-traders query cache ahead of navigation, so the
 * Rive artboard can mount with live trader data (and real avatars) as soon as
 * the onboarding screen appears, instead of showing its own loading state
 * while the fetch is still in flight.
 */
export const prefetchOnboardingLeaderboardData = (
  queryClient: QueryClient,
  chains: string[],
): Promise<void> =>
  queryClient.prefetchQuery({
    queryKey: buildOnboardingLeaderboardQueryKey(chains),
  });
