import { useEffect, useRef, useCallback } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';

export enum KycStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface KycResponse {
  status: KycStatus | null;
  type: string | null;
}

export interface KycPollingResult {
  kycResponse: KycResponse | null;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

const useKycPolling = (
  pollingInterval: number = 10000,
  autoStart: boolean = true,
): KycPollingResult => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [
    { data: userDetailsResponse, error, isFetching: loading },
    getUserDetails,
  ] = useDepositSdkMethod('getUserDetails');

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();

    // Call immediately
    getUserDetails();

    // Set up interval
    intervalRef.current = setInterval(() => {
      getUserDetails();
    }, pollingInterval);
  }, [getUserDetails, pollingInterval, stopPolling]);

  const status = userDetailsResponse?.kyc?.l1?.status ?? null;
  const type = userDetailsResponse?.kyc?.l1?.type ?? null;

  const kycResponse: KycResponse = {
    status: status as KycStatus | null,
    type,
  };

  useEffect(() => {
    if (status === KycStatus.APPROVED || status === KycStatus.REJECTED) {
      stopPolling();
    }
  }, [status, stopPolling]);

  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, startPolling, stopPolling]);

  return {
    kycResponse,
    loading,
    error,
    startPolling,
    stopPolling,
  };
};

export default useKycPolling;
