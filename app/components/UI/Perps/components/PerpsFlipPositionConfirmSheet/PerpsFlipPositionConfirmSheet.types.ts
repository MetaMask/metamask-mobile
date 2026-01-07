import type { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import type { Position } from '../../controllers/types';

export interface PerpsFlipPositionConfirmSheetProps {
  position: Position;
  sheetRef?: React.RefObject<BottomSheetRef>;
  onClose?: () => void;
  onConfirm?: () => void;
}
