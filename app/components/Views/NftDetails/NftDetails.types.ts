import { Nft } from '@metamask/assets-controllers';
import { StyleProp, TextStyle, ViewProps } from 'react-native';

export interface NftDetailsParams {
  collectible: Nft;
}

export interface NftDetailsInformationRowProps extends ViewProps {
  title: string;
  value?: string | null;
  titleStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  onValuePress?: () => void;
}

export interface NftDetailsBoxProps extends ViewProps {
  title?: string;
  value: string | null;
  titleStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  onValuePress?: () => void;

  titleTextStyle?: StyleProp<TextStyle>;
  valueTextStyle?: StyleProp<TextStyle>;
}
