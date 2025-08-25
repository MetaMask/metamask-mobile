import {
  useSeasonStatus,
  type UseSeasonStatusResult,
  type UseSeasonStatusOptions,
} from './useSeasonStatus';
import { useRewardsSubscription } from './useRewardsSubscription';

export interface UseCurrentSeasonStatusOptions
  extends Omit<UseSeasonStatusOptions, 'seasonId'> {}

export interface UseCurrentSeasonStatusResult extends UseSeasonStatusResult {}

/**
 * Convenience hook that combines useRewardsSubscription and useSeasonStatus
 * Automatically uses the current subscription to fetch season status
 */
export const useCurrentSeasonStatus = (
  options: UseCurrentSeasonStatusOptions = {},
): UseCurrentSeasonStatusResult => {
  const { ...seasonStatusOptions } = options;
  const { subscription } = useRewardsSubscription();

  // Fetch season status using subscription
  const { seasonStatus, isLoading, error, refresh, isRefreshing } =
    useSeasonStatus({
      ...seasonStatusOptions,
      seasonId: 'current',
      subscriptionId: subscription?.id || undefined,
    });

  return {
    seasonStatus,
    isLoading,
    error,
    refresh,
    isRefreshing,
  };
};
