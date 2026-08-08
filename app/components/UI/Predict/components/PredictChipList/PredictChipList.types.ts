import type { ImageSourcePropType } from 'react-native';

export interface PredictChipItem {
  key: string;
  label: string;
  imageSource?: ImageSourcePropType;
}

export interface PredictChipListProps {
  chips: PredictChipItem[];
  activeChipKey: string;
  onChipSelect: (key: string) => void;
  testID?: string;
  containerTwClassName?: string;
  chipTwClassName?: string;
  getChipTestId?: (key: string) => string;
  useGestureHandlerScrollView?: boolean;
}
