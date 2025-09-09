/**
 * Custom hook to fetch geo rewards metadata including location and support status
 */

import { useCallback, useEffect } from 'react';
import Engine from '../../../../core/Engine';
import { useDispatch } from 'react-redux';
import {
  setGeoRewardsMetadata,
  setGeoRewardsMetadataLoading,
} from '../../../../reducers/rewards';

export const useGeoRewardsMetadata = (): null => {
  const dispatch = useDispatch();

  const fetchGeoRewardsMetadata = useCallback(async (): Promise<void> => {
    dispatch(setGeoRewardsMetadataLoading(true));

    try {
      const metadata = await Engine.controllerMessenger.call(
        'RewardsController:getGeoRewardsMetadata',
      );

      dispatch(setGeoRewardsMetadata(metadata));
    } catch (err) {
      dispatch(setGeoRewardsMetadata(null));
      // Keep existing data on error to prevent UI flash
      dispatch(setGeoRewardsMetadata(null));
    } finally {
      dispatch(setGeoRewardsMetadataLoading(false));
    }
  }, [dispatch]);

  // Initial data fetch
  useEffect(() => {
    fetchGeoRewardsMetadata();
  }, [fetchGeoRewardsMetadata]);

  return null;
};
