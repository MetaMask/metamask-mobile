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
  selectCampaignsHasLoaded,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

interface CategorizedCampaigns {
  active: CampaignDto[];
  upcoming: CampaignDto[];
  previous: CampaignDto[];
}

interface UseRewardCampaignsReturn {
  /** Campaigns fetched from the API */
  campaigns: CampaignDto[];
  /** Campaigns categorized by status */
  categorizedCampaigns: CategorizedCampaigns;
  /** Whether campaigns are loading */
  isLoading: boolean;
  /** Whether there was an error fetching campaigns */
  hasError: boolean;
  /** Whether campaigns have been loaded at least once */
  hasLoaded: boolean;
  /** Fetch campaigns from the API */
  fetchCampaigns: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage campaigns data from the rewards API.
 * Categorizes campaigns into active, upcoming, and previous (complete).
 */
export const useRewardCampaigns = (): UseRewardCampaignsReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const campaigns = useSelector(selectCampaigns);
  const isLoading = useSelector(selectCampaignsLoading);
  const hasError = useSelector(selectCampaignsError);
  const hasLoaded = useSelector(selectCampaignsHasLoaded);
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(hasLoaded);
  hasLoadedRef.current = hasLoaded;

  const fetchCampaigns = useCallback(async (): Promise<void> => {
    if (!subscriptionId) {
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
      if (!hasLoadedRef.current) {
        dispatch(setCampaignsLoading(true));
      }
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
  }, [dispatch, subscriptionId]);

  const campaignsList = useMemo(() => campaigns ?? [], [campaigns]);

  const categorizedCampaigns = useMemo((): CategorizedCampaigns => {
    const active: CampaignDto[] = [];
    const upcoming: CampaignDto[] = [];
    const previous: CampaignDto[] = [];

    campaignsList.forEach((campaign) => {
      const status = getCampaignStatus(campaign);
      switch (status) {
        case 'active':
          active.push(campaign);
          break;
        case 'upcoming':
          upcoming.push(campaign);
          break;
        case 'complete':
          previous.push(campaign);
          break;
      }
    });

    return { active, upcoming, previous };
  }, [campaignsList]);

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
    campaigns: campaignsList,
    categorizedCampaigns,
    isLoading,
    hasError,
    hasLoaded,
    fetchCampaigns,
  };
};
