import React, { useCallback, useEffect, useRef, useState } from 'react';
import { addBreadcrumb } from '@sentry/react-native';
import { PerpsConnectionManager } from '../../services/PerpsConnectionManager';
import PerpsConnectionErrorView from '../PerpsConnectionErrorView';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { ensureError } from '../../../../../util/errorUtils';
import { isE2E } from '../../../../../util/test/utils';

const ANALYTICS_DEBOUNCE_MS = 1000;

/**
 * Centralized error gate that renders a single PerpsConnectionErrorView when
 * the connection manager reports an error. Mounted once inside PerpsScreenStack
 * so that regardless of how many PerpsConnectionProvider instances exist
 * (including nested modal stacks), only one error view is ever displayed.
 *
 * Handles retry logic and debounces analytics events to prevent rapid
 * error→null→error flap cycles from emitting duplicate PERPS_SCREEN_VIEWED events.
 */
export const PerpsGlobalErrorGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [error, setError] = useState<string | null>(() => {
    if (isE2E) return null;
    return PerpsConnectionManager.getConnectionState().error;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const { track } = usePerpsEventTracking();

  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const analyticsDebounceRef = useRef<NodeJS.Timeout>();
  const lastTrackedErrorRef = useRef<string | null>(null);
  const lastTrackedRetryRef = useRef<number>(0);

  useEffect(() => {
    if (isE2E) return;

    const updateState = () => {
      const state = PerpsConnectionManager.getConnectionState();
      setError((prev) => (prev !== state.error ? state.error : prev));
      setIsConnecting((prev) =>
        prev !== state.isConnecting ? state.isConnecting : prev,
      );
    };

    pollIntervalRef.current = setInterval(updateState, 100);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Debounced analytics: fires once per distinct error occurrence, suppressing
  // rapid error→null→error flaps within ANALYTICS_DEBOUNCE_MS.
  useEffect(() => {
    if (!error) {
      lastTrackedErrorRef.current = null;
      lastTrackedRetryRef.current = 0;
      if (analyticsDebounceRef.current) {
        clearTimeout(analyticsDebounceRef.current);
        analyticsDebounceRef.current = undefined;
      }
      return;
    }

    if (
      error === lastTrackedErrorRef.current &&
      retryAttempts === lastTrackedRetryRef.current
    ) {
      return;
    }

    if (analyticsDebounceRef.current) {
      clearTimeout(analyticsDebounceRef.current);
    }

    analyticsDebounceRef.current = setTimeout(() => {
      addBreadcrumb({
        category: 'perps.connection',
        message: 'PerpsGlobalErrorGate error view shown',
        level: 'error',
        data: {
          errorCode: error,
          retryAttempts,
        },
      });
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.ERROR,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.CONNECTION_ERROR,
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]: PERPS_EVENT_VALUE.ERROR_TYPE.NETWORK,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: error,
        [PERPS_EVENT_PROPERTY.RETRY_ATTEMPTS]: retryAttempts,
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERP_MARKETS,
      });
      lastTrackedErrorRef.current = error;
      lastTrackedRetryRef.current = retryAttempts;
      analyticsDebounceRef.current = undefined;
    }, ANALYTICS_DEBOUNCE_MS);

    return () => {
      if (analyticsDebounceRef.current) {
        clearTimeout(analyticsDebounceRef.current);
        analyticsDebounceRef.current = undefined;
      }
    };
  }, [error, retryAttempts, track]);

  // Clean up debounce timer on unmount
  useEffect(
    () => () => {
      if (analyticsDebounceRef.current) {
        clearTimeout(analyticsDebounceRef.current);
      }
    },
    [],
  );

  const handleRetry = useCallback(async () => {
    const nextAttempt = retryAttempts + 1;
    setRetryAttempts(nextAttempt);

    try {
      await PerpsConnectionManager.reconnectWithNewContext({ force: true });
      setRetryAttempts(0);
    } catch (err) {
      addBreadcrumb({
        category: 'perps.connection',
        message: 'Retry failed',
        level: 'warning',
        data: {
          error: ensureError(err, 'PerpsGlobalErrorGate.handleRetry').message,
          retryAttempts: nextAttempt,
        },
      });
    }

    const state = PerpsConnectionManager.getConnectionState();
    setError(state.error);
    setIsConnecting(state.isConnecting);
  }, [retryAttempts]);

  if (!error) {
    return <>{children}</>;
  }

  return (
    <PerpsConnectionErrorView
      error={error}
      onRetry={handleRetry}
      isRetrying={isConnecting}
      showBackButton
      retryAttempts={retryAttempts}
    />
  );
};
