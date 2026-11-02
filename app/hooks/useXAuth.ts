import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import type { XProfile } from '@metamask/profile-controller';
import {
  connectX,
  disconnectXAccount,
  fetchAndUpdateXAccount,
  getErrorMessage,
  XAuthError,
  XAuthErrorType,
} from '../core/XAuthService';
import {
  selectIsConnectedToX,
  selectProfileControllerXProfile,
} from '../selectors/profileController';

export interface UseXAuth {
  isConnected: boolean;
  xProfile: XProfile | undefined;
  /** True while the connect (OAuth) flow is in flight. */
  isConnecting: boolean;
  /** True while the disconnect flow is in flight. */
  isDisconnecting: boolean;
  /** True while the refresh flow is in flight. */
  isRefreshing: boolean;
  /**
   * Failure recorded by the last `connect`, cleared when the next `connect`
   * starts.
   */
  connectError: XAuthError | undefined;
  /**
   * Failure recorded by the last `disconnect`, cleared when the next
   * `disconnect` starts.
   */
  disconnectError: XAuthError | undefined;
  /**
   * Failure recorded by the last `refresh`, cleared when the next `refresh`
   * starts.
   */
  refreshError: XAuthError | undefined;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Passes XAuthError through as-is and wraps anything else as a network failure. */
const toXAuthError = (error: unknown): XAuthError => {
  if (error instanceof XAuthError) {
    return error;
  }
  return new XAuthError(XAuthErrorType.NetworkFailure, getErrorMessage(error));
};

/**
 * Exposes X (Twitter) connection state and the connect/disconnect/refresh
 * actions from the X auth flow.
 */
export const useXAuth = (): UseXAuth => {
  const isConnected = useSelector(selectIsConnectedToX);
  const xProfile = useSelector(selectProfileControllerXProfile);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // One slice per action: a `refresh` failure must not be readable as a
  // `disconnect` failure, because both run against the same X link.
  const [connectError, setConnectError] = useState<XAuthError | undefined>(
    undefined,
  );
  const [disconnectError, setDisconnectError] = useState<
    XAuthError | undefined
  >(undefined);
  const [refreshError, setRefreshError] = useState<XAuthError | undefined>(
    undefined,
  );

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setConnectError(undefined);
    try {
      await connectX();
    } catch (error_) {
      setConnectError(toXAuthError(error_));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setDisconnectError(undefined);
    try {
      await disconnectXAccount();
    } catch (error_) {
      setDisconnectError(toXAuthError(error_));
    } finally {
      setIsDisconnecting(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(undefined);
    try {
      await fetchAndUpdateXAccount();
    } catch (error_) {
      setRefreshError(toXAuthError(error_));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    isConnected,
    xProfile,
    isConnecting,
    isDisconnecting,
    isRefreshing,
    connectError,
    disconnectError,
    refreshError,
    connect,
    disconnect,
    refresh,
  };
};
