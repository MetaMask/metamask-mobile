import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Announces a Withdraw message whenever it changes. iOS ignores
 * `accessibilityLiveRegion`, so the explicit announcement is what reaches
 * VoiceOver; the live region still serves Android.
 */
export const useWithdrawAnnouncement = (message: string | null): void => {
  useEffect(() => {
    if (message) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);
};
