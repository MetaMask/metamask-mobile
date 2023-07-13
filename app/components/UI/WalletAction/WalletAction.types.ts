import { ImageStyle, ViewStyle } from 'react-native';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

export interface WalletActionProps {
  actionTitle: string;
  actionDescription: string;
  iconName: IconName;
  iconSize: AvatarSize;
  onPress: () => void;
  containerStyle?: ViewStyle;
  iconStyle?: ImageStyle;
}
