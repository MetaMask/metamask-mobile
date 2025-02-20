// Internal dependencies.
import { BottomSheetDialogProps } from './foundation/BottomSheetDialog/BottomSheetDialog.types';
import { BottomSheetOverlayProps } from './foundation/BottomSheetOverlay/BottomSheetOverlay.types';

/**
 * BottomSheet component props.
 */
export interface BottomSheetProps extends BottomSheetDialogProps {
  /**
   * Optional boolean that indicates if sheet isUnmounted from the stack or not when closed.
   * @default true
   */
  shouldNavigateBack?: boolean;
  /**
   * Optional prop to pass in props needed for the BottomSheetOverlay
   * @default true
   */
  bottomSheetOverlayProps?: BottomSheetOverlayProps;
}

export type BottomSheetPostCallback = () => void;

export interface BottomSheetRef {
  onOpenBottomSheet: (callback?: BottomSheetPostCallback) => void;
  onCloseBottomSheet: (callback?: BottomSheetPostCallback) => void;
}
