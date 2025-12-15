import { useEffect, useRef } from 'react';
import { ScreenOrientationService } from './ScreenOrientationService';

interface UseScreenOrientationOptions {
  /**
   * Whether to allow landscape orientation for this screen/component.
   * When true, the screen will unlock orientation to follow device position.
   * When false or when the component unmounts, orientation locks back to portrait.
   */
  allowLandscape: boolean;
}

/**
 * Hook to control screen orientation for a specific screen or component.
 *
 * This hook allows screens to opt-in to landscape orientation support.
 * When the component unmounts or `allowLandscape` becomes false,
 * the orientation is automatically locked back to portrait.
 *
 * @example
 * // In a modal that should allow landscape
 * const MyFullscreenModal = ({ isVisible }) => {
 *   useScreenOrientation({ allowLandscape: isVisible });
 *
 *   return <Modal>{...}</Modal>;
 * };
 *
 * @example
 * // In a screen that always allows landscape
 * const LandscapeScreen = () => {
 *   useScreenOrientation({ allowLandscape: true });
 *
 *   return <View>{...}</View>;
 * };
 */
export function useScreenOrientation({
  allowLandscape,
}: UseScreenOrientationOptions): void {
  // Track if we unlocked orientation to ensure proper cleanup
  const hasUnlockedRef = useRef(false);

  useEffect(() => {
    const updateOrientation = async () => {
      if (allowLandscape) {
        await ScreenOrientationService.allowLandscape();
        hasUnlockedRef.current = true;
      } else if (hasUnlockedRef.current) {
        // Only lock if we previously unlocked
        await ScreenOrientationService.lockToPortrait();
        hasUnlockedRef.current = false;
      }
    };

    updateOrientation();

    // Cleanup: lock back to portrait when component unmounts
    return () => {
      if (hasUnlockedRef.current) {
        ScreenOrientationService.lockToPortrait();
        hasUnlockedRef.current = false;
      }
    };
  }, [allowLandscape]);
}

export default useScreenOrientation;
