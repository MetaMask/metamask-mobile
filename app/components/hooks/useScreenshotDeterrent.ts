import { useState, useCallback } from 'react';
import { addScreenshotListener } from 'expo-screen-capture';
import { useFocusEffect } from '@react-navigation/native';
import Device from '../../util/device';

const useScreenshotDeterrent = (warning: () => void) => {
  const [enabled, setEnabled] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      // Android blocks the capture outright, so there is nothing to warn
      // about. Staying off Android also avoids the media-read permission that
      // screenshot detection needs there before Android 14.
      if (Device.isAndroid()) {
        return undefined;
      }

      const subscription = addScreenshotListener(() => {
        if (enabled) {
          warning();
        }
      });

      return () => subscription.remove();
    }, [enabled, warning]),
  );

  return [setEnabled];
};

export default useScreenshotDeterrent;
