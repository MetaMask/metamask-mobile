import { useState, useEffect } from 'react';
import { addScreenshotListener } from 'react-native-detector';

const useScreenshotWarning = (warning: () => void) => {
  const [enabled, setEnabled] = useState<boolean>(false);
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
