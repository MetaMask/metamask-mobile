import { useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
//import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type FeedbackType = 'yes' | 'no' | 'skip' | 'undo' | 'error' | 'success';

interface UseSwipeFeedbackReturn {
  triggerHaptic: (type: FeedbackType) => void;
  triggerVibration: (duration?: number) => void;
}

/**
 * Hook for haptic and vibration feedback on swipe actions
 *
 * Provides different haptic patterns for different actions:
 * - YES: Medium impact (positive action)
 * - NO: Medium impact (positive action)
 * - SKIP: Light impact (neutral action)
 * - UNDO: Soft notification
 * - ERROR: Heavy impact
 * - SUCCESS: Selection
 */
export function useSwipeFeedback(): UseSwipeFeedbackReturn {
  const triggerHaptic = useCallback((type: FeedbackType) => {
    const options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };

    let hapticType: string;

    switch (type) {
      case 'yes':
      case 'no':
        // Medium impact for bet actions
        hapticType = Platform.OS === 'ios' ? 'impactMedium' : 'effectClick';
        break;
      case 'skip':
        // Light impact for skip
        hapticType = Platform.OS === 'ios' ? 'impactLight' : 'effectTick';
        break;
      case 'undo':
        // Soft notification for undo
        hapticType = Platform.OS === 'ios' ? 'notificationWarning' : 'effectDoubleClick';
        break;
      case 'error':
        // Heavy impact for error
        hapticType = Platform.OS === 'ios' ? 'notificationError' : 'effectHeavyClick';
        break;
      case 'success':
        // Selection for success
        hapticType = Platform.OS === 'ios' ? 'notificationSuccess' : 'effectClick';
        break;
      default:
        hapticType = Platform.OS === 'ios' ? 'impactLight' : 'effectTick';
    }

    try {
      /*ReactNativeHapticFeedback.trigger(
        hapticType as Parameters<typeof ReactNativeHapticFeedback.trigger>[0],
        options,
      );*/
    } catch (error) {
      // Fallback to vibration if haptic feedback fails
      console.warn('Haptic feedback failed, falling back to vibration:', error);
      Vibration.vibrate(50);
    }
  }, []);

  const triggerVibration = useCallback((duration: number = 50) => {
    try {
      Vibration.vibrate(duration);
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }, []);

  return {
    triggerHaptic,
    triggerVibration,
  };
}

export default useSwipeFeedback;

