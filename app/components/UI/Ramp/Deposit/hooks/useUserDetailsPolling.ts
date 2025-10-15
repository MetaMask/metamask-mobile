import { useEffect, useRef, useCallback, useState } from 'react';
import { useDepositUser } from './useDepositUser';
import { NativeTransakUserDetails } from '@consensys/native-ramps-sdk';
import { KycStatus } from '../constants';
import Logger from '../../../../../util/Logger';

export interface UserDetailsPollingResult {
  userDetails: NativeTransakUserDetails | null;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook to poll for user details from the SDK
 *
 * @param pollingInterval - The interval in milliseconds to poll for user details
 * @param autoStart - Whether to automatically start polling
 * @param maxPollingAttempts - The maximum number of polling attempts before stopping. Set to 0 to poll indefinitely.
 */
const useUserDetailsPolling = (
  pollingInterval: number = 10000,
  autoStart: boolean = true,
  maxPollingAttempts: number = 30,
): UserDetailsPollingResult => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const {
    userDetails,
    error: sdkError,
    isFetching: loading,
    fetchUserDetails,
  } = useDepositUser();

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollCountRef.current = 0;
    setPollingError(null);

    const pollUserDetails = async () => {
      try {
        await fetchUserDetails();
      } catch (error) {
        Logger.error(
          error as Error,
          'useUserDetailsPolling: Error fetching user details',
        );
      }
    };

    // Call immediately
    pollUserDetails();
    pollCountRef.current += 1;

    // Set up interval
    intervalRef.current = setInterval(() => {
      pollCountRef.current += 1;

      if (maxPollingAttempts > 0 && pollCountRef.current > maxPollingAttempts) {
        setPollingError(
          'User details polling reached maximum attempts. Please try again later.',
        );
        stopPolling();
        return;
      }

      pollUserDetails();
    }, pollingInterval);
  }, [fetchUserDetails, pollingInterval, stopPolling, maxPollingAttempts]);

  const kycStatus = userDetails?.kyc?.status;

  useEffect(() => {
    if (
      kycStatus &&
      kycStatus !== KycStatus.NOT_SUBMITTED &&
      kycStatus !== KycStatus.SUBMITTED
    ) {
      stopPolling();
    }
  }, [kycStatus, stopPolling]);

  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, startPolling, stopPolling]);

  return {
    userDetails,
    loading,
    error: pollingError || sdkError,
    startPolling,
    stopPolling,
  };
};

export default useUserDetailsPolling;
