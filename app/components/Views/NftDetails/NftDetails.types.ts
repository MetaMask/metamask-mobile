import { Collectible } from '../../../components/UI/CollectibleMedia/CollectibleMedia.types';
import { StyleProp, ViewProps, ViewStyle } from 'react-native';

export interface NftDetailsParams {
  collectible: Collectible;
}

export interface NftDetailsInformationRowProps extends ViewProps {
  title: string;
  value: string | number | undefined;
  titleStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  onValuePress?: () => void;
}

export interface NftDetailsBoxProps extends ViewProps {
  title: string;
  value: string | number | undefined;
  titleStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  onValuePress?: () => void;

  titleTextStyle?: StyleProp<ViewStyle>;
  valueTextStyle?: StyleProp<ViewStyle>;
}
