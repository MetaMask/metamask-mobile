import type { RefObject } from 'react';
import type { BottomSheetRef } from '@metamask/design-system-react-native';

export interface PerpsCrossMarginConfirmBottomSheetProps {
  /**
   * Whether the sheet is rendered. Defaults to true.
   */
  isVisible?: boolean;
  /**
   * Called when the sheet is dismissed (close button, "Go back" or swipe).
   */
  onClose: () => void;
  /**
   * Called when the user confirms after acknowledging every item.
   */
  onConfirm: () => void;
  /**
   * Optional external ref, used when the parent controls the sheet lifecycle
   * (for example when rendered through a navigation route).
   */
  sheetRef?: RefObject<BottomSheetRef | null>;
}
