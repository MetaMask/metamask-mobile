/**
 * Custom hook to fetch geo rewards metadata including location and support status
 */

import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { useDispatch } from 'react-redux';
import {
  setGeoRewardsMetadata,
  setGeoRewardsMetadataLoading,
} from '../../../../reducers/rewards';

export const useGeoRewardsMetadata = (): null => {
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);

  const fetchGeoRewardsMetadata = useCallback(async (): Promise<void> => {
    // Skip fetch if already loading (prevents duplicate requests)
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
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
      isLoadingRef.current = false;
      dispatch(setGeoRewardsMetadataLoading(false));
    }
  }, [dispatch]);

  // Initial data fetch
  useFocusEffect(
    useCallback(() => {
      fetchGeoRewardsMetadata();
    }, [fetchGeoRewardsMetadata]),
  );

  return null;
};
