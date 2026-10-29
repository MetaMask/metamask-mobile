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
  error: XAuthError | undefined;
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
  const [error, setError] = useState<XAuthError | undefined>(undefined);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);
    try {
      await connectX();
    } catch (error_) {
      setError(toXAuthError(error_));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setError(undefined);
    try {
      await disconnectXAccount();
    } catch (error_) {
      setError(toXAuthError(error_));
    } finally {
      setIsDisconnecting(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(undefined);
    try {
      await fetchAndUpdateXAccount();
    } catch (error_) {
      setError(toXAuthError(error_));
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
    error,
    connect,
    disconnect,
    refresh,
  };
};
