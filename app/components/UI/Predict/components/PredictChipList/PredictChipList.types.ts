import type { ImageSource } from 'expo-image';

export interface PredictChipItem {
  key: string;
  label: string;
  imageSource?: ImageSource;
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
