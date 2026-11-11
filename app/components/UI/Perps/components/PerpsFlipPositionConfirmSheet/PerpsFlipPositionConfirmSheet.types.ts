import type { BottomSheetRef } from '@metamask/design-system-react-native';
import { type Position } from '@metamask/perps-controller';

export interface PerpsFlipPositionConfirmSheetProps {
  position: Position;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  onClose?: () => void;
  onConfirm?: () => void;
  enableHaptics?: boolean;
}
