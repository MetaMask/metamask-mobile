import type {
  PerpsProviderInfo,
  PerpsProviderType,
} from '../../controllers/types';

export interface PerpsProviderSelectorProps {
  testID?: string;
}

export interface PerpsProviderSelectorBadgeProps {
  currentProvider: PerpsProviderInfo;
  onPress: () => void;
  testID?: string;
}

export interface PerpsProviderSelectorSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  providers: PerpsProviderInfo[];
  activeProvider: PerpsProviderType;
  onSelectProvider: (providerId: PerpsProviderType) => void;
  sheetRef?: React.RefObject<
    import('../../../../../component-library/components/BottomSheets/BottomSheet').BottomSheetRef
  >;
  testID?: string;
}

export interface PerpsProviderSwitchWarningProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromProvider: string;
  toProvider: string;
  openPositionsCount: number;
  testID?: string;
}
