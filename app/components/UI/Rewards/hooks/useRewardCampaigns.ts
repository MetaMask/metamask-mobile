import { useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import {
  setCampaigns,
  setCampaignsLoading,
  setCampaignsError,
} from '../../../../reducers/rewards';
import {
  selectCampaigns,
  selectCampaignsLoading,
  selectCampaignsError,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';

interface UseRewardCampaignsReturn {
  /** Campaigns fetched from the API, or empty array when flag is disabled */
  campaigns: CampaignDto[];
  /** Whether campaigns are loading */
  isLoading: boolean;
  /** Whether there was an error fetching campaigns */
  hasError: boolean;
  /** Fetch campaigns from the API */
  fetchCampaigns: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage campaigns data from the rewards API.
 * Returns an empty list when the rewards-campaigns-enabled feature flag is off.
 */
export const useRewardCampaigns = (): UseRewardCampaignsReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const campaigns = useSelector(selectCampaigns);
  const isLoading = useSelector(selectCampaignsLoading);
  const hasError = useSelector(selectCampaignsError);
  const isCampaignsEnabled = useSelector(selectCampaignsRewardsEnabledFlag);
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);

  const fetchCampaigns = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !isCampaignsEnabled) {
      dispatch(setCampaigns([]));
      dispatch(setCampaignsLoading(false));
      dispatch(setCampaignsError(false));
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(setCampaignsLoading(true));
      dispatch(setCampaignsError(false));

      const campaignsData = await Engine.controllerMessenger.call(
        'RewardsController:getCampaigns',
        subscriptionId,
      );

      dispatch(setCampaigns(campaignsData));
    } catch {
      dispatch(setCampaignsError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setCampaignsLoading(false));
    }
  }, [dispatch, subscriptionId, isCampaignsEnabled]);

  useFocusEffect(
    useCallback(() => {
      fetchCampaigns();
    }, [fetchCampaigns]),
  );

  const invalidateEvents = useMemo(
    () =>
      [
        'RewardsController:accountLinked',
        'RewardsController:balanceUpdated',
      ] as const,
    [],
  );

  useInvalidateByRewardEvents(invalidateEvents, fetchCampaigns);

  return {
    campaigns: campaigns ?? [],
    isLoading,
    hasError,
    fetchCampaigns,
  };
};
