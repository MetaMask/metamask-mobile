import { useState, useEffect, useCallback, useMemo } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';
import Device from '../../util/device';

// iOS specific hook

const useScreenshotWarning = (warning: () => void) => {
  const [enabled, setEnabled] = useState<boolean>(false);

  const screenshotDetect = NativeModules.ScreenshotDetect;
  const detectorEventEmitter = useMemo(
    () => new NativeEventEmitter(screenshotDetect),
    [screenshotDetect],
  );

  const commonAddScreenshotListener = useCallback(
    (listener: () => void): any => {
      const eventSubscription = detectorEventEmitter.addListener(
        'UIApplicationUserDidTakeScreenshotNotification',
        () => listener(),
      );

      return () => {
        eventSubscription.remove();
      };
    },
    [detectorEventEmitter],
  );

  const addScreenshotListener = useCallback(
    (listener: () => void): any => {
      const unsubscribe = commonAddScreenshotListener(listener);
      return () => {
        unsubscribe();
      };
    },
    [commonAddScreenshotListener],
  );

  useEffect(() => {
    if (Device.isAndroid()) {
      return;
    }

    const userDidScreenshot = () => {
      if (enabled) {
        warning();
      }
    };
    const unsubscribe = addScreenshotListener(userDidScreenshot);
    return () => {
      unsubscribe();
    };
  }, [addScreenshotListener, enabled, warning]);

  return [setEnabled];
};

export default useScreenshotWarning;
