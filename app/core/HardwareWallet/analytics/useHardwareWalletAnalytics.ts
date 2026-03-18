import { useCallback, useEffect, useRef } from 'react';
import {
  HardwareWalletConnectionState,
  HardwareWalletType,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../Analytics';
import {
  HardwareWalletAnalyticsErrorState,
  getErrorStateFromConnectionState,
  getAnalyticsDeviceType,
  buildRawErrorString,
} from './types';

interface UseHardwareWalletAnalyticsOptions {
  connectionState: HardwareWalletConnectionState;
  walletType: HardwareWalletType | null;
  flow: string;
  deviceModel: string | null;
}

interface UseHardwareWalletAnalyticsResult {
  trackPrimaryButtonClicked: () => void;
}

/**
 * Tracks hardware wallet recovery analytics events by reacting to
 * `connectionState` transitions.
 *
 * - **Recovery Modal Viewed** – fires each time the user enters an
 * error or "awaiting app" state.
 * - **Recovery Primary Button Clicked** – fires when the user taps
 * Continue/Retry from the error or awaiting-app screen.
 * - **Recovery Success Modal Viewed** – fires when the device reaches
 * the Ready state after at least one error/recovery step.
 *
 * `error_state_view_count` is tracked per error_state and resets on
 * success or when the flow is dismissed.
 */
export function useHardwareWalletAnalytics({
  connectionState,
  walletType,
  flow,
  deviceModel,
}: UseHardwareWalletAnalyticsOptions): UseHardwareWalletAnalyticsResult {
  const { trackEvent, createEventBuilder } = useMetrics();

  const viewCountsRef = useRef<Map<string, number>>(new Map());
  const lastErrorStateRef = useRef<HardwareWalletAnalyticsErrorState | null>(
    null,
  );
  const lastErrorViewCountRef = useRef(0);
  const lastRawErrorRef = useRef('');
  const prevStatusRef = useRef<ConnectionStatus>(ConnectionStatus.Disconnected);
  const hasSeenErrorRef = useRef(false);

  useEffect(() => {
    const currentStatus = connectionState.status;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = currentStatus;

    if (currentStatus === prevStatus) return;

    const isRecoveryState =
      currentStatus === ConnectionStatus.ErrorState ||
      currentStatus === ConnectionStatus.AwaitingApp;

    if (isRecoveryState) {
      hasSeenErrorRef.current = true;

      const errorState = getErrorStateFromConnectionState(connectionState);
      if (!errorState) return;

      const currentCount = viewCountsRef.current.get(errorState) ?? 0;
      const newCount = currentCount + 1;
      viewCountsRef.current.set(errorState, newCount);

      lastErrorStateRef.current = errorState;
      lastErrorViewCountRef.current = newCount;
      lastRawErrorRef.current = buildRawErrorString(connectionState);

      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_MODAL_VIEWED,
        )
          .addProperties({
            flow,
            device_type: getAnalyticsDeviceType(walletType),
            ...(deviceModel && { device_model: deviceModel }),
            error_state: errorState,
            error_state_view_count: newCount,
            raw_error: lastRawErrorRef.current,
          })
          .build(),
      );
    }

    if (currentStatus === ConnectionStatus.Ready && hasSeenErrorRef.current) {
      const lastErrorState = lastErrorStateRef.current;

      if (lastErrorState) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_SUCCESS_MODAL_VIEWED,
          )
            .addProperties({
              flow,
              device_type: getAnalyticsDeviceType(walletType),
              ...(deviceModel && { device_model: deviceModel }),
              error_state: lastErrorState,
              error_state_view_count: lastErrorViewCountRef.current,
              raw_error: lastRawErrorRef.current,
            })
            .build(),
        );
      }

      viewCountsRef.current.clear();
      lastErrorStateRef.current = null;
      lastErrorViewCountRef.current = 0;
      lastRawErrorRef.current = '';
      hasSeenErrorRef.current = false;
    }

    if (currentStatus === ConnectionStatus.Disconnected) {
      viewCountsRef.current.clear();
      lastErrorStateRef.current = null;
      lastErrorViewCountRef.current = 0;
      lastRawErrorRef.current = '';
      hasSeenErrorRef.current = false;
    }
  }, [
    connectionState,
    walletType,
    flow,
    deviceModel,
    trackEvent,
    createEventBuilder,
  ]);

  const trackPrimaryButtonClicked = useCallback(() => {
    const errorState = getErrorStateFromConnectionState(connectionState);
    if (!errorState) return;

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.HARDWARE_WALLET_RECOVERY_PRIMARY_BUTTON_CLICKED,
      )
        .addProperties({
          flow,
          device_type: getAnalyticsDeviceType(walletType),
          ...(deviceModel && { device_model: deviceModel }),
          error_state: errorState,
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

  return { trackPrimaryButtonClicked };
}
