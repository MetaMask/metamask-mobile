import { useQuery } from '@metamask/react-data-query';
import type {
  FetchTraderFollowingOptions,
  FollowingResponse,
} from '@metamask/social-controllers';
import { useCallback, useMemo } from 'react';
import type { FollowedTrader } from '../../NotificationPreferences/hooks';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';

export interface UseTraderFollowingOptions {
  addressOrId: string;
  /**
   * When false, skip fetching. Defaults to true.
   */
  enabled?: boolean;
}

export interface UseTraderFollowingResult {
  traders: FollowedTrader[];
  count: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_TRADERS: FollowedTrader[] = [];

const TRADER_FOLLOWING_SOURCE = 'useTraderFollowing';

export const buildTraderFollowingQueryKey = (
  options: FetchTraderFollowingOptions,
): ['SocialService:fetchTraderFollowing', FetchTraderFollowingOptions] => [
  'SocialService:fetchTraderFollowing',
  { addressOrId: options.addressOrId },
];

/**
 * Fetches the traders another profile follows.
 *
 * Source of truth is `SocialService:fetchTraderFollowing`
 * (`GET /traders/:addressOrId/following`). Distinct from
 * `useFollowedTraders`, which loads the current user's outbound list.
 *
 * @param options - Trader identifier and optional `enabled` gate.
 * @returns The following list plus loading/error/refresh helpers.
 */
export const useTraderFollowing = (
  options: UseTraderFollowingOptions,
): UseTraderFollowingResult => {
  const enabled = options.enabled ?? true;
  const addressOrId = options.addressOrId;

  const { data, isLoading, error, refetch } = useQuery<FollowingResponse>({
    queryKey: buildTraderFollowingQueryKey({ addressOrId }),
    enabled: enabled && Boolean(addressOrId),
  });

  useLogSocialQueryError(error, {
    surface: 'followed_traders',
    operation: 'fetch_trader_following',
    extraMessage: 'Trader following fetch failed',
    source: TRADER_FOLLOWING_SOURCE,
    endpoint: 'following',
  });

  const traders = useMemo<FollowedTrader[]>(() => {
    if (!data?.following) {
      return EMPTY_TRADERS;
    }
    return data.following.map((profile) => ({
      id: profile.profileId,
      username: profile.name,
      address: profile.address,
      avatarUri: profile.imageUrl ?? undefined,
    }));
  }, [data]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      reportSocialServiceFailure(
        err,
        {
          surface: 'followed_traders',
          operation: 'refresh',
          extraMessage: 'Trader following refresh failed',
          source: TRADER_FOLLOWING_SOURCE,
          endpoint: 'following',
        },
        { breadcrumb: false },
      );
      throw err;
    }
  }, [refetch]);

  return {
    traders,
    count: data?.count ?? traders.length,
    isLoading: enabled && Boolean(addressOrId) && isLoading,
    error: formatSocialQueryErrorMessage(error),
    refresh,
  };
};

export default useTraderFollowing;
