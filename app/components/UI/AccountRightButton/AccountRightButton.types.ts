import { ViewStyle } from 'react-native';
export interface AccountRightButtonProps {
  selectedAddress: string;
  onPress: () => void;
  isNetworkVisible?: boolean;
  style?: ViewStyle;
}
