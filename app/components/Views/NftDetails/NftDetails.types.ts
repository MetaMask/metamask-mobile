import { Nft } from '@metamask/assets-controllers';
import { StyleProp, ViewProps, ViewStyle } from 'react-native';

export type NftDetailsParams = {
  collectible: Nft;
};

export interface NftDetailsInformationRowProps extends ViewProps {
  title: string;
  value?: string | null;
  titleStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  onValuePress?: () => void;
}

export interface NftDetailsBoxProps extends ViewProps {
  title?: string;
  value: string | null;
  titleStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  onValuePress?: () => void;

  titleTextStyle?: StyleProp<ViewStyle>;
  valueTextStyle?: StyleProp<ViewStyle>;
}
