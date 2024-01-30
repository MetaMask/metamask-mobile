// Internal dependencies.
import { BottomSheetDialogProps } from './foundation/BottomSheetDialog/BottomSheetDialog.types';

/**
 * BottomSheet component props.
 */
export interface BottomSheetProps extends BottomSheetDialogProps {
  /**
   * Optional boolean that indicates if sheet isUnmounted from the stack or not when closed.
   * @default true
   */
  shouldNavigateBack?: boolean;
}

export type BottomSheetPostCallback = () => void;

export interface BottomSheetRef {
  onOpenBottomSheet: (callback?: BottomSheetPostCallback) => void;
  onCloseBottomSheet: (callback?: BottomSheetPostCallback) => void;
}
