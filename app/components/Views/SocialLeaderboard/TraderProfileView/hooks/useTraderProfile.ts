import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  TraderProfileResponse,
  FetchTraderProfileOptions,
} from '@metamask/social-controllers';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import {
  useFollowToggle,
  type UseFollowToggleResult,
} from '../../../../hooks/useFollowToggle';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';

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
  const fetchOptions: FetchTraderProfileOptions = { addressOrId };

  const queryKey: [string, FetchTraderProfileOptions] = [
    'SocialService:fetchTraderProfile',
    fetchOptions,
  ];

  const { data, isLoading, error, refetch } = useQuery<TraderProfileResponse>({
    queryKey,
    enabled: Boolean(addressOrId) && isUnlocked,
    refetchInterval: options?.refetchInterval,
  });

  useLogSocialQueryError(error, {
    surface: 'trader_profile',
    operation: 'fetch_profile',
    extraMessage: 'Trader profile fetch failed',
    source: TRADER_PROFILE_SOURCE,
    endpoint: 'trader_profile',
  });

  const { isFollowing, toggleFollow } = useFollowToggle(addressOrId);

  const profile = data ?? null;

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
