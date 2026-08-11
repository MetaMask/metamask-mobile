import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignVolumeByCampaignId,
  selectPerpsTradingCampaignVolumeLoadingByCampaignId,
  selectPerpsTradingCampaignVolumeErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignVolume,
  setPerpsTradingCampaignVolumeLoading,
  setPerpsTradingCampaignVolumeError,
} from '../../../../reducers/rewards';
import type { PerpsTradingCampaignVolumeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetPerpsTradingCampaignVolumeResult {
  volume: PerpsTradingCampaignVolumeDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetPerpsTradingCampaignVolume = (
  campaignId: string | undefined,
): UseGetPerpsTradingCampaignVolumeResult => {
  const dispatch = useDispatch();

  const selectVolume = useMemo(
    () => selectPerpsTradingCampaignVolumeByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectPerpsTradingCampaignVolumeLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectPerpsTradingCampaignVolumeErrorByCampaignId(campaignId),
    [campaignId],
  );

  const volume = useSelector(selectVolume);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);

  const fetchVolume = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      return;
    }

    try {
      dispatch(
        setPerpsTradingCampaignVolumeLoading({ campaignId, loading: true }),
      );
      dispatch(
        setPerpsTradingCampaignVolumeError({ campaignId, error: false }),
      );
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPerpsTradingCampaignVolume',
        campaignId,
      );
      dispatch(setPerpsTradingCampaignVolume({ campaignId, volume: result }));
    } catch {
      dispatch(setPerpsTradingCampaignVolumeError({ campaignId, error: true }));
    } finally {
      dispatch(
        setPerpsTradingCampaignVolumeLoading({ campaignId, loading: false }),
      );
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchVolume();
  }, [fetchVolume]);

  return { volume, isLoading, hasError, refetch: fetchVolume };
};

export default useGetPerpsTradingCampaignVolume;
