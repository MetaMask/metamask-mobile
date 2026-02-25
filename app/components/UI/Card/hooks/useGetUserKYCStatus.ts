import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import Logger from '../../../../util/Logger';
import { CardVerificationState, UserResponse } from '../types';
import { cardKeys } from '../queries';

export interface UserKYCStatus {
  verificationState: CardVerificationState | null;
  userId: string | null;
  userDetails: UserResponse | null;
}

interface UseGetUserKYCStatusResult {
  kycStatus: UserKYCStatus | null;
  isLoading: boolean;
  error: Error | null;
  fetchKYCStatus: () => Promise<UserKYCStatus | null>;
}

/**
 * Hook to fetch user KYC verification status.
 * Only fetches when user is authenticated.
 *
 * @param isAuthenticated - Whether the user is authenticated
 * @returns KYC status data, loading state, error, and fetch function
 */
const useGetUserKYCStatus = (
  isAuthenticated: boolean,
): UseGetUserKYCStatusResult => {
  const { sdk } = useCardSDK();

  const { data, isLoading, error, refetch } = useQuery<UserKYCStatus | null>({
    queryKey: cardKeys.kycStatus(),
    queryFn: async () => {
      try {
        if (!sdk) throw new Error('SDK not initialized');
        const response = await sdk.getUserDetails();

        return {
          verificationState: response.verificationState ?? null,
          userId: response.id,
          userDetails: response,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err : new Error('Failed to fetch KYC status');
        Logger.log('useGetUserKYCStatus: Error fetching KYC status', err);
        throw errorMessage;
      }
    },
    enabled: isAuthenticated && !!sdk,
    staleTime: 60_000,
  });

  const fetchKYCStatus = useCallback(async () => {
    const result = await refetch();
    return result.data ?? null;
  }, [refetch]);

  return {
    kycStatus: data ?? null,
    isLoading,
    error: error as Error | null,
    fetchKYCStatus,
  };
};

export default useGetUserKYCStatus;
