import { useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { selectScamCallDetectionEnabled } from '../../../selectors/featureFlagController/scamCallDetection';

const getCallDetectionModule = () => NativeModules.RCTCallDetection;

interface UseCallDetectionResult {
  isOnCall: boolean;
  isDismissed: boolean;
  dismiss: () => void;
}

const useCallDetection = (): UseCallDetectionResult => {
  const isFeatureEnabled = useSelector(selectScamCallDetectionEnabled);
  const [isOnCall, setIsOnCall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const previousCallState = useRef(false);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const checkCallState = useCallback(async () => {
    const nativeModule = getCallDetectionModule();
    if (!nativeModule?.checkCallState) return;
    try {
      const onCall = await nativeModule.checkCallState();
      setIsOnCall(onCall);

      // Reset dismiss state when a new call is detected (transition from idle → active)
      if (onCall && !previousCallState.current) {
        setIsDismissed(false);
      }
      previousCallState.current = onCall;
    } catch {
      // Native module not available — gracefully degrade
    }
  }, []);

  useEffect(() => {
    const nativeModule = getCallDetectionModule();
    if (!isFeatureEnabled || !nativeModule) return;

    const eventEmitter = new NativeEventEmitter(nativeModule);

    const subscription = eventEmitter.addListener(
      'onCallStateChanged',
      (event: { isOnCall: boolean }) => {
        const { isOnCall: onCall } = event;
        setIsOnCall(onCall);

        // Reset dismiss state when a new call is detected
        if (onCall && !previousCallState.current) {
          setIsDismissed(false);
        }
        previousCallState.current = onCall;
      },
    );

    // Check state on mount
    checkCallState();

    // Poll every 3 seconds as a fallback (native events may not fire on all devices)
    const pollInterval = setInterval(checkCallState, 3000);

    // Re-check when app comes to foreground
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'active') {
          checkCallState();
        }
      },
    );

    return () => {
      subscription.remove();
      appStateSubscription.remove();
      clearInterval(pollInterval);
    };
  }, [isFeatureEnabled, checkCallState]);

  // When feature is disabled, always return inactive state
  if (!isFeatureEnabled) {
    return { isOnCall: false, isDismissed: false, dismiss: () => undefined };
  }

  return { isOnCall, isDismissed, dismiss };
};

export default useCallDetection;
