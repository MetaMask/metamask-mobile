import { ViewStyle } from 'react-native';

export interface PerpsTokenLogoProps {
  symbol: string;
  size?: number;
  style?: ViewStyle;
  testID?: string;
  recyclingKey?: string; // For FlashList optimization
}
