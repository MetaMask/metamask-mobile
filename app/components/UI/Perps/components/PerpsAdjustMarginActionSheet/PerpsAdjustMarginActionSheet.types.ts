import type { BottomSheetRef } from '@metamask/design-system-react-native';

export type AdjustMarginAction = 'add_margin' | 'reduce_margin';

export interface PerpsAdjustMarginActionSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelectAction: (action: AdjustMarginAction) => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  testID?: string;
}
