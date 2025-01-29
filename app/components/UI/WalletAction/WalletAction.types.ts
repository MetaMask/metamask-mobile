import { ImageStyle, ViewStyle } from 'react-native';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';

export enum WalletActionType {
  Buy = 'Buy',
  Sell = 'Sell',
  Swap = 'Swap',
  Bridge = 'Bridge',
  Send = 'Send',
  Receive = 'Receive',
  Earn = 'Earn',
}

export interface WalletActionDetail {
  title: string;
  description: string;
  disabledDescription: string;
}

export interface WalletActionProps {
  actionType?: WalletActionType;
  iconName: IconName;
  iconSize: AvatarSize;
  onPress: () => void;
  containerStyle?: ViewStyle;
  iconStyle?: ImageStyle;
  actionID?: string;
  disabled?: boolean;
}
