import type { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ONBOARDING_TOP_TRADERS_LIMIT } from '../../components/Views/SocialLeaderboard/Onboarding/constants';
import {
  buildOnboardingLeaderboardQueryKey,
  prefetchOnboardingLeaderboardData,
} from './socialLeaderboardOnboardingQueries';

describe('socialLeaderboardOnboardingQueries', () => {
  const chains = ['base', 'solana'];

  describe('buildOnboardingLeaderboardQueryKey', () => {
    it('matches the exact shape useTopTraders builds for the onboarding screen', () => {
      // Must stay byte-for-byte compatible with useTopTraders' query key, or a
      // prefetch here silently warms a different cache entry than the one the
      // onboarding screen reads.
      expect(buildOnboardingLeaderboardQueryKey(chains)).toEqual([
        'SocialService:fetchLeaderboard',
        { limit: ONBOARDING_TOP_TRADERS_LIMIT, chains },
      ]);
    });
  });

  describe('prefetchOnboardingLeaderboardData', () => {
    it('prefetches with the onboarding query key on the given query client', async () => {
      const prefetchQuery = jest.fn().mockResolvedValue(undefined);
      const queryClient = { prefetchQuery } as unknown as QueryClient;

      await prefetchOnboardingLeaderboardData(queryClient, chains);

      expect(prefetchQuery).toHaveBeenCalledWith({
        queryKey: buildOnboardingLeaderboardQueryKey(chains),
      });
    });

    it('propagates a rejected prefetch so callers can decide how to handle it', async () => {
      const error = new Error('network down');
      const queryClient = {
        prefetchQuery: jest.fn().mockRejectedValue(error),
      } as unknown as QueryClient;

      await expect(
        prefetchOnboardingLeaderboardData(queryClient, chains),
      ).rejects.toThrow(error);
    });
  });
});
