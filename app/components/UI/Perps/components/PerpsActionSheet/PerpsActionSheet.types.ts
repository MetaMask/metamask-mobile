import type {
  BottomSheetRef,
  IconName,
} from '@metamask/design-system-react-native';

export interface PerpsActionSheetOption<T extends string> {
  action: T;
  label: string;
  description: string;
  iconName: IconName;
  testID: string;
}

export interface PerpsActionSheetProps<T extends string> {
  isVisible?: boolean;
  onClose: () => void;
  title: string;
  options: PerpsActionSheetOption<T>[];
  onSelectAction: (action: T) => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  testID?: string;
}
