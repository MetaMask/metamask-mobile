import { useCallback } from 'react';
import { useCardSDK } from '../sdk';
import Logger from '../../../../util/Logger';
import { CardVerificationState, UserResponse } from '../types';
import { useWrapWithCache } from './useWrapWithCache';

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
 * Hook to fetch user KYC verification status
 * Only fetches when user is authenticated
 *
 * @param isAuthenticated - Whether the user is authenticated
 * @returns {UseGetUserKYCStatusResult} KYC status data, loading state, error, and fetch function
 */
const useGetUserKYCStatus = (
  isAuthenticated: boolean,
): UseGetUserKYCStatusResult => {
  const { sdk } = useCardSDK();

  const fetchKYCStatusInternal = useCallback(async () => {
    if (!isAuthenticated || !sdk) {
      return null;
    }

    try {
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
  }, [sdk, isAuthenticated]);

  const cacheResult = useWrapWithCache('kyc-status', fetchKYCStatusInternal, {
    cacheDuration: 60 * 1000, // 60 seconds cache
    fetchOnMount: false, // Disabled - fetchAllData orchestrates fetching
  });

  const { data, isLoading, error, fetchData } = cacheResult;

  return {
    kycStatus: data,
    isLoading,
    error,
    fetchKYCStatus: fetchData,
  };
};

export default useGetUserKYCStatus;
