import { useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import Logger from '../../../../util/Logger';
import { CardVerificationState, UserResponse } from '../types';
import { dashboardKeys } from '../queries';

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
 *
 * @returns KYC status data, loading state, error, and fetch function
 */
const useGetUserKYCStatus = (): UseGetUserKYCStatusResult => {
  const { sdk } = useCardSDK();
  const sdkRef = useRef(sdk);
  sdkRef.current = sdk;

  const { data, isLoading, error, refetch } = useQuery<UserKYCStatus | null>({
    queryKey: dashboardKeys.kycStatus(),
    queryFn: async () => {
      try {
        const currentSdk = sdkRef.current;
        if (!currentSdk) throw new Error('SDK not initialized');
        const response = await currentSdk.getUserDetails();

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
    enabled: false,
    staleTime: 0,
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
