import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import type {
  TraderProfileResponse,
  FetchTraderProfileOptions,
} from '@metamask/social-controllers';
import Logger from '../../../../../util/Logger';
import {
  addSocialBreadcrumb,
  buildSocialLoggerErrorOptions,
  categoriseSocialError,
  extractHttpStatus,
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

  const { isFollowing, toggleFollow } = useFollowToggle(addressOrId);

  const profile = data ?? null;

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      Logger.error(
        err as Error,
        buildSocialLoggerErrorOptions({
          surface: 'trader_profile',
          operation: 'refresh',
          extraMessage: 'Trader profile refresh failed',
          source: 'useTraderProfile',
          endpoint: 'trader_profile',
          error: err,
        }),
      );
      throw err;
    }
  }, [refetch]);

  useEffect(() => {
    if (error) {
      Logger.error(
        error as Error,
        buildSocialLoggerErrorOptions({
          surface: 'trader_profile',
          operation: 'fetch_profile',
          extraMessage: 'Trader profile fetch failed',
          source: 'useTraderProfile',
          endpoint: 'trader_profile',
          error,
        }),
      );
      addSocialBreadcrumb({
        endpoint: 'trader_profile',
        errorCategory: categoriseSocialError(error),
        httpStatus: extractHttpStatus(error),
      });
    }
  }, [error]);

  return {
    profile,
    isLoading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    isFollowing,
    toggleFollow,
    refresh,
  };
};

export default useTraderProfile;
