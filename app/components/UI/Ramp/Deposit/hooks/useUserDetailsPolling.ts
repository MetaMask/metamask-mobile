import { useEffect, useRef, useCallback, useState } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { NativeTransakUserDetails } from '@consensys/native-ramps-sdk';

export interface UserDetailsPollingResult {
  userDetails: NativeTransakUserDetails | null;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

const useUserDetailsPolling = (
  pollingInterval: number = 10000,
  autoStart: boolean = true,
): UserDetailsPollingResult => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const [
    { data: userDetails, error: sdkError, isFetching: loading },
    fetchUserDetails,
  ] = useDepositSdkMethod({
    method: 'getUserDetails',
    onMount: false,
  });

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setPollingError(null);

    // Call immediately
    fetchUserDetails();

    // Set up interval
    intervalRef.current = setInterval(() => {
      fetchUserDetails();
    }, pollingInterval);
  }, [fetchUserDetails, pollingInterval, stopPolling]);

  useEffect(() => {
    if (userDetails?.kyc?.l1?.status !== KycStatus.NOT_SUBMITTED) {
      stopPolling();
    }
  }, [userDetails?.kyc?.l1?.status, stopPolling]);

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
