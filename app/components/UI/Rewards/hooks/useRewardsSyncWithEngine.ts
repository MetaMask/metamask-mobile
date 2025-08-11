import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectRewardsSubscription } from '../../../../selectors/rewardscontroller';
import {
  setSubscription,
  setSeasonStatus,
  resetRewardsState,
} from '../../../../actions/rewards';
import { useCurrentSeasonStatus } from './useCurrentSeasonStatus';
import {
  setGeoLocation,
  setSeasonStatusLoading,
} from '../../../../reducers/rewards';
import { useRewardsGeoLocation } from './useRewardsGeoLocation';

/**
 * Hook that synchronizes the rewards controller engine state with the UI store state
 * This ensures that UI components always have access to the latest controller data
 * via the rewards reducer state
 */
export const useRewardsSyncWithEngine = () => {
  const dispatch = useDispatch();

  // Get subscription from engine state
  const subscription = useSelector(selectRewardsSubscription);

  // Get current season status using existing hook
  const { seasonStatus, isLoading: isSeasonStatusLoading } =
    useCurrentSeasonStatus();

  const { geoLocation } = useRewardsGeoLocation();

  // Sync subscription data with UI store
  useEffect(() => {
    if (subscription) {
      dispatch(setSubscription(subscription));
    } else {
      // Clear subscription when not available
      dispatch(resetRewardsState());
    }
  }, [subscription, dispatch]);

  // Sync season status with UI store
  useEffect(() => {
    if (seasonStatus) {
      dispatch(setSeasonStatus(seasonStatus));
    } else {
      // Clear season status when not available
      dispatch(setSeasonStatus(null));
    }
  }, [seasonStatus, dispatch]);

  // Sync season status loading with UI store
  useEffect(() => {
    dispatch(setSeasonStatusLoading(isSeasonStatusLoading));
  }, [isSeasonStatusLoading, dispatch]);

  // Sync geo location with UI store
  useEffect(() => {
    if (geoLocation) {
      dispatch(setGeoLocation(geoLocation));
    } else {
      // Clear geo location when not available
      dispatch(setGeoLocation(null));
    }
  }, [geoLocation, dispatch]);

  return {
    subscription,
    seasonStatus,
    isLoading: isSeasonStatusLoading,
  };
};
