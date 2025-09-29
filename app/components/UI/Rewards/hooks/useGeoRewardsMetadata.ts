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
  setGeoRewardsMetadataError,
} from '../../../../reducers/rewards';

interface UseGeoRewardsMetadataProps {
  enabled?: boolean;
}

interface UseGeoRewardsMetadataReturn {
  fetchGeoRewardsMetadata: () => Promise<void>;
}

export const useGeoRewardsMetadata = ({
  enabled = true,
}: UseGeoRewardsMetadataProps): UseGeoRewardsMetadataReturn => {
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);

  const fetchGeoRewardsMetadata = useCallback(async (): Promise<void> => {
    // Skip fetch if already loading (prevents duplicate requests)
    if (isLoadingRef.current || !enabled) {
      if (!enabled) {
        dispatch(setGeoRewardsMetadataError(false));
        dispatch(setGeoRewardsMetadataLoading(false));
        dispatch(setGeoRewardsMetadata(null));
      }
      return;
    }
    isLoadingRef.current = true;
    dispatch(setGeoRewardsMetadataLoading(true));
    dispatch(setGeoRewardsMetadataError(false));

    try {
      const metadata = await Engine.controllerMessenger.call(
        'RewardsController:getGeoRewardsMetadata',
      );

      dispatch(setGeoRewardsMetadata(metadata));
    } catch (err) {
      dispatch(setGeoRewardsMetadataError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setGeoRewardsMetadataLoading(false));
    }
  }, [dispatch, enabled]);

  // Initial data fetch
  useFocusEffect(
    useCallback(() => {
      fetchGeoRewardsMetadata();
    }, [fetchGeoRewardsMetadata]),
  );

  return { fetchGeoRewardsMetadata };
};
