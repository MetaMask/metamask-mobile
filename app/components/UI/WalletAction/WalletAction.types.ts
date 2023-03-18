import { ImageStyle, ViewStyle } from 'react-native';
import {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

export interface WalletActionI {
  actionTitle: string;
  actionDescription: string;
  iconName: IconName;
  iconSize: IconSize;
  onPress: () => void;
  containerStyle?: ViewStyle;
  iconStyle?: ImageStyle;
}
