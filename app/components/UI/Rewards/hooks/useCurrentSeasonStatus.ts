import {
  useSeasonStatus,
  type UseSeasonStatusResult,
  type UseSeasonStatusOptions,
} from './useSeasonStatus';
import { useRewardsSubscription } from './useRewardsSubscription';

export interface UseCurrentSeasonStatusOptions
  extends Omit<UseSeasonStatusOptions, 'seasonId' | 'subscriptionId'> {
  /**
   * Season ID to fetch status for
   * If not provided, will not fetch data
   */
  seasonId?: string;
}

export interface UseCurrentSeasonStatusResult extends UseSeasonStatusResult {
  /**
   * Whether user is authenticated for rewards
   */
  isAuthenticated: boolean;
  /**
   * Current subscription data
   */
  subscriptionId: string | null;
  /**
   * Last authenticated account address
   */
  lastAuthenticatedAccount: string | null;
}

/**
 * Convenience hook that combines useRewardsSubscription and useSeasonStatus
 * Automatically uses the current subscription to fetch season status
 */
export const useCurrentSeasonStatus = (
  options: UseCurrentSeasonStatusOptions = {},
): UseCurrentSeasonStatusResult => {
  const { seasonId, ...seasonStatusOptions } = options;

  // Get subscription information
  const { subscriptionId, isAuthenticated, lastAuthenticatedAccount } =
    useRewardsSubscription();

  // Fetch season status using subscription
  const { seasonStatus, isLoading, error, refresh, isRefreshing } =
    useSeasonStatus({
      ...seasonStatusOptions,
      seasonId,
      subscriptionId: subscriptionId || undefined,
    });

  return {
    seasonStatus,
    isLoading,
    error,
    refresh,
    isRefreshing,
    isAuthenticated,
    subscriptionId,
    lastAuthenticatedAccount,
  };
};
