import { useCallback, useRef } from 'react';
import type { BottomSheetRef } from '@metamask/design-system-react-native';

/**
 * Records a pre-prompt response, then closes the sheet. The button action
 * runs only after the close animation finishes, so it cannot start while the
 * sheet is still on screen.
 */
export const usePrePromptSheetClose = (onUserAnswered?: () => void) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const closeWithAction = useCallback(
    (action?: () => void) => {
      onUserAnswered?.();
      const callback = () => action?.();
      if (!bottomSheetRef.current) {
        callback();
        return;
      }
      bottomSheetRef.current.onCloseBottomSheet(callback);
    },
    [onUserAnswered],
  );

  const closeFromIcon = useCallback(() => {
    onUserAnswered?.();
    bottomSheetRef.current?.onCloseBottomSheet();
  }, [onUserAnswered]);

  return { bottomSheetRef, closeFromIcon, closeWithAction };
};
