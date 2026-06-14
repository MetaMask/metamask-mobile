import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignVolume,
  selectPerpsTradingCampaignVolumeLoading,
  selectPerpsTradingCampaignVolumeError,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignVolume,
  setPerpsTradingCampaignVolumeLoading,
  setPerpsTradingCampaignVolumeError,
} from '../../../../reducers/rewards';

export interface UseGetPerpsTradingCampaignVolumeResult {
  volume: ReturnType<typeof selectPerpsTradingCampaignVolume>;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetPerpsTradingCampaignVolume = (
  campaignId: string | undefined,
): UseGetPerpsTradingCampaignVolumeResult => {
  const dispatch = useDispatch();
  const volume = useSelector(selectPerpsTradingCampaignVolume);
  const isLoading = useSelector(selectPerpsTradingCampaignVolumeLoading);
  const hasError = useSelector(selectPerpsTradingCampaignVolumeError);

  const fetchVolume = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      dispatch(setPerpsTradingCampaignVolumeLoading(false));
      dispatch(setPerpsTradingCampaignVolumeError(false));
      return;
    }

    try {
      dispatch(setPerpsTradingCampaignVolumeLoading(true));
      dispatch(setPerpsTradingCampaignVolumeError(false));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPerpsTradingCampaignVolume',
        campaignId,
      );
      dispatch(setPerpsTradingCampaignVolume(result));
    } catch {
      dispatch(setPerpsTradingCampaignVolumeError(true));
    } finally {
      dispatch(setPerpsTradingCampaignVolumeLoading(false));
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchVolume();
  }, [fetchVolume]);

  return { volume, isLoading, hasError, refetch: fetchVolume };
};

export default useGetPerpsTradingCampaignVolume;
