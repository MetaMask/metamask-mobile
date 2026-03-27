import { StyleProp, ViewStyle } from 'react-native';

export interface SRPListProps {
  onKeyringSelect: (id: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
  showArrowName?: string;
}
