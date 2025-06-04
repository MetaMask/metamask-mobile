import { useEffect, useRef, useCallback } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { NativeTransakUserDetailsKyc } from '@consensys/native-ramps-sdk';

export interface KycPollingResult {
  kycResponse: NativeTransakUserDetailsKyc | null;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

const useKycPolling = (
  pollingInterval: number = 5000,
  autoStart: boolean = true,
): KycPollingResult => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sdkMethod: getUserDetails,
    response: userDetailsResponse,
    loading,
    error,
  } = useDepositSdkMethod('getUserDetails');

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

  const status = userDetailsResponse?.kyc?.l1?.status;

  useEffect(() => {
    if (status === 'APPROVED' || status === 'REJECTED') {
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
    kycResponse: userDetailsResponse?.kyc ?? null,
    loading,
    error,
    startPolling,
    stopPolling,
  };
};

export default useKycPolling;
