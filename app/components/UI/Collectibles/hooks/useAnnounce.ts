import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useAnnounce(shouldAnnounce: boolean, message: string) {
  useEffect(() => {
    if (shouldAnnounce) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [shouldAnnounce, message]);
}
