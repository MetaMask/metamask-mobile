import type { ViewStyle } from 'react-native';

export interface SRPListProps {
  onKeyringSelect: (id: string) => void;
  containerStyle?: ViewStyle;
  showArrowName?: string;
}
