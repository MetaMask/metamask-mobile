import type { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';

export type AdjustMarginAction = 'add_margin' | 'reduce_margin';

export interface PerpsAdjustMarginActionSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelectAction: (action: AdjustMarginAction) => void;
  sheetRef?: React.RefObject<BottomSheetRef>;
  testID?: string;
}
