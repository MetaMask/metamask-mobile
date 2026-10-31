import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type { TraderProfileResponse } from '@metamask/social-controllers';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import {
  publishServerFollowerCount,
  useDisplayedFollowerCount,
} from '../../../../hooks/optimisticFollowerCount';
import {
  useFollowToggle,
  type UseFollowToggleResult,
} from '../../../../hooks/useFollowToggle';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { buildTraderProfileQueryKey } from '../../../../../util/social/traderProfileQueries';

export interface UseTraderProfileOptions {
  refetchInterval?: number;
}

export interface UseTraderProfileResult {
  profile: TraderProfileResponse | null;
  isLoading: boolean;
  error: string | null;
  isFollowing: boolean;
  toggleFollow: UseFollowToggleResult['toggleFollow'];
  refresh: () => Promise<void>;
}

const TRADER_PROFILE_SOURCE = 'useTraderProfile';

export const useTraderProfile = (
  addressOrId: string,
  options?: UseTraderProfileOptions,
): UseTraderProfileResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const queryKey = buildTraderProfileQueryKey(addressOrId);

  const { data, isLoading, error, refetch } = useQuery<TraderProfileResponse>({
    queryKey,
    enabled: Boolean(addressOrId) && isUnlocked,
    refetchInterval: options?.refetchInterval,
    refetchOnMount: 'always',
  });

  useLogSocialQueryError(error, {
    surface: 'trader_profile',
    operation: 'fetch_profile',
    extraMessage: 'Trader profile fetch failed',
    source: TRADER_PROFILE_SOURCE,
    endpoint: 'trader_profile',
  });

  const { isFollowing, toggleFollow } = useFollowToggle(addressOrId);

  // Read on tap, synchronously. An effect would still be holding the previous
  // server count for a frame after this query data updates.
  publishServerFollowerCount(addressOrId, data?.followerCount);
  const displayedFollowerCount = useDisplayedFollowerCount(
    addressOrId,
    data?.followerCount,
  );
  const profile = useMemo(() => {
    if (!data) {
      return null;
    }
    if (
      displayedFollowerCount === null ||
      displayedFollowerCount === undefined ||
      displayedFollowerCount === data.followerCount
    ) {
      return data;
    }
    return { ...data, followerCount: displayedFollowerCount };
  }, [data, displayedFollowerCount]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      reportSocialServiceFailure(
        err,
        {
          surface: 'trader_profile',
          operation: 'refresh',
          extraMessage: 'Trader profile refresh failed',
          source: TRADER_PROFILE_SOURCE,
          endpoint: 'trader_profile',
        },
        { breadcrumb: false },
      );
      throw err;
    }
  }, [refetch]);

  return {
    profile,
    isLoading,
    error: formatSocialQueryErrorMessage(error),
    isFollowing,
    toggleFollow,
    refresh,
  };
};

export default useTraderProfile;
