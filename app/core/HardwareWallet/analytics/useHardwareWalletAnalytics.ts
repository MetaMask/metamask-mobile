import { useCallback, useEffect, useRef } from 'react';
import {
  HardwareWalletConnectionState,
  HardwareWalletType,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../Analytics';
import {
  HardwareWalletAnalyticsErrorType,
  HardwareWalletAnalyticsFlow,
  getErrorTypeFromConnectionState,
  getAnalyticsDeviceType,
  getErrorDetails,
  type ErrorDetails,
} from './helpers';

interface UseHardwareWalletAnalyticsOptions {
  connectionState: HardwareWalletConnectionState;
  walletType: HardwareWalletType | null;
  flow: HardwareWalletAnalyticsFlow;
  deviceModel: string | null;
}

interface UseHardwareWalletAnalyticsResult {
  trackCTAClicked: () => void;
  resetAnalyticsState: () => void;
}

/**
 * Tracks hardware wallet recovery analytics events by reacting to
 * `connectionState` transitions.
 *
 * - **Recovery Modal Viewed** – fires each time the user enters an
 * error or "awaiting app" state.
 * - **Recovery CTA Clicked** – fires when the user taps
 * Continue/Retry from the error or awaiting-app screen.
 * - **Recovery Success Modal Viewed** – fires every time the device
 * reaches the Ready state. Error-related properties are only
 * included when the user recovered from a preceding error.
 *
 * `error_type_view_count` is tracked per error_type and resets on
 * success or when the flow is dismissed.
 */
export function useHardwareWalletAnalytics({
  connectionState,
  walletType,
  flow,
  deviceModel,
}: UseHardwareWalletAnalyticsOptions): UseHardwareWalletAnalyticsResult {
  const { trackEvent, createEventBuilder } = useAnalytics();

  const viewCountsRef = useRef<Map<string, number>>(new Map());
  const lastErrorTypeRef = useRef<HardwareWalletAnalyticsErrorType | null>(
    null,
  );
  const lastErrorTypeViewCountRef = useRef(0);
  const lastErrorDetailsRef = useRef<ErrorDetails>({
    error_code: '',
    error_message: '',
  });
  const prevStatusRef = useRef<ConnectionStatus>(ConnectionStatus.Disconnected);

  const resetAnalyticsState = useCallback(() => {
    viewCountsRef.current.clear();
    lastErrorTypeRef.current = null;
    lastErrorTypeViewCountRef.current = 0;
    lastErrorDetailsRef.current = { error_code: '', error_message: '' };
  }, []);

  useEffect(() => {
    const currentStatus = connectionState.status;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = currentStatus;

    if (currentStatus === prevStatus) return;

    const isRecoveryState =
      currentStatus === ConnectionStatus.ErrorState ||
      currentStatus === ConnectionStatus.AwaitingApp;

    const isSuccessState = currentStatus === ConnectionStatus.Ready;

    if (isRecoveryState) {
      const errorType = getErrorTypeFromConnectionState(connectionState);
      if (!errorType) return;

      const currentCount = viewCountsRef.current.get(errorType) ?? 0;
      const newCount = currentCount + 1;
      viewCountsRef.current.set(errorType, newCount);

      const errorDetails = getErrorDetails(connectionState);

      lastErrorTypeRef.current = errorType;
      lastErrorTypeViewCountRef.current = newCount;
      lastErrorDetailsRef.current = errorDetails;

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_MODAL_VIEWED,
        )
          .addProperties({
            location: flow,
            device_type: getAnalyticsDeviceType(walletType),
            ...(deviceModel && { device_model: deviceModel }),
            error_type: errorType,
            error_type_view_count: newCount,
            error_code: errorDetails.error_code,
            error_message: errorDetails.error_message,
          })
          .build(),
      );
    }

    if (isSuccessState) {
      const lastErrorType = lastErrorTypeRef.current;

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_SUCCESS_MODAL_VIEWED,
        )
          .addProperties({
            location: flow,
            device_type: getAnalyticsDeviceType(walletType),
            ...(deviceModel && { device_model: deviceModel }),
            ...(lastErrorType && {
              error_type: lastErrorType,
              error_type_view_count: lastErrorTypeViewCountRef.current,
              error_code: lastErrorDetailsRef.current.error_code,
              error_message: lastErrorDetailsRef.current.error_message,
            }),
          })
          .build(),
      );

      resetAnalyticsState();
    }
  }, [
    connectionState,
    walletType,
    flow,
    deviceModel,
    trackEvent,
    createEventBuilder,
    resetAnalyticsState,
  ]);

  const trackCTAClicked = useCallback(() => {
    const errorType = getErrorTypeFromConnectionState(connectionState);
    if (!errorType) return;

    const errorDetails = getErrorDetails(connectionState);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_CTA_CLICKED)
        .addProperties({
          location: flow,
          device_type: getAnalyticsDeviceType(walletType),
          ...(deviceModel && { device_model: deviceModel }),
          error_type: errorType,
          error_type_view_count: viewCountsRef.current.get(errorType) ?? 1,
          error_code: errorDetails.error_code,
          error_message: errorDetails.error_message,
        })
        .build(),
    );
  }, [
    connectionState,
    walletType,
    flow,
    deviceModel,
    trackEvent,
    createEventBuilder,
  ]);

  return { trackCTAClicked, resetAnalyticsState };
}
