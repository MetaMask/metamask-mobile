import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import type { XProfile } from '@metamask/profile-controller';
import {
  connectX,
  disconnectXAccount,
  fetchAndUpdateXAccount,
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
  isConnecting: boolean;
  error: XAuthError | undefined;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Converts an unknown thrown value to a message string. */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/** Passes XAuthError through as-is and wraps anything else as a network failure. */
const toXAuthError = (error: unknown): XAuthError => {
  if (error instanceof XAuthError) {
    return error;
  }
  return new XAuthError(
    XAuthErrorType.NetworkFailure,
    getErrorMessage(error),
  );
};

/**
 * Exposes X (Twitter) connection state and the connect/disconnect/refresh
 * actions from the X auth flow.
 */
export const useXAuth = (): UseXAuth => {
  const isConnected = useSelector(selectIsConnectedToX);
  const xProfile = useSelector(selectProfileControllerXProfile);
  const [isConnecting, setIsConnecting] = useState(false);
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
    setIsConnecting(true);
    setError(undefined);
    try {
      await disconnectXAccount();
    } catch (error_) {
      setError(toXAuthError(error_));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);
    try {
      await fetchAndUpdateXAccount();
    } catch (error_) {
      setError(toXAuthError(error_));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  return {
    isConnected,
    xProfile,
    isConnecting,
    error,
    connect,
    disconnect,
    refresh,
  };
};
