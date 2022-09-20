import { useState, useEffect, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

enum EventsName {
  UserDidTakeScreenshot = 'UIApplicationUserDidTakeScreenshotNotification',
}

type Unsubscribe = () => void;

const useScreenshotWarning = (warning: () => void) => {
  const { ScreenshotDetector } = NativeModules;
  const detectorEventEmitter = new NativeEventEmitter(ScreenshotDetector);
  const [enabled, setEnabled] = useState<boolean>(false);

  const commonAddScreenshotListener = (listener: () => void): () => void => {
    const eventSubscription = detectorEventEmitter.addListener(
      EventsName.UserDidTakeScreenshot,
      () => listener(),
      {}
    );
  
    return () => {
      eventSubscription.remove();
    };
  };

  const getListenersCount = (): number => {
    return (
      detectorEventEmitter.listenerCount?.('UIApplicationUserDidTakeScreenshotNotification') ??
      // @ts-ignore
      detectorEventEmitter.listeners?.('UIApplicationUserDidTakeScreenshotNotification').length ??
      0
    );
  };

  const addScreenshotListener = (listener: () => void): Unsubscribe => {
    if (getListenersCount() === 0) {
      ScreenshotDetector.startScreenshotDetection();
    }

    const unsubscribe: Unsubscribe = commonAddScreenshotListener(listener);

    return () => {
      unsubscribe();

      if (getListenersCount() === 0) {
        ScreenshotDetector.stopScreenshotDetection();
      }
    };
  };

  useEffect(() => {
    const userDidScreenshot = () => {
      if (enabled) {
        warning();
      }
    };
    const unsubscribe = addScreenshotListener(userDidScreenshot);
    return () => {
      unsubscribe();
    };
  }, [enabled, warning]);

  return [setEnabled];
};

export default useScreenshotWarning;
