import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { Position } from '@metamask/perps-controller';

export type ModifyAction =
  | 'add_to_position'
  | 'reduce_position'
  | 'flip_position';

export interface PerpsModifyActionSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  position: Position | null;
  onActionSelect: (action: ModifyAction) => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  testID?: string;
}
