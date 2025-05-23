import { Nft } from '@metamask/assets-controllers';
import { StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';
import React from 'react';

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
  titleStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  onValuePress?: () => void;

  titleTextStyle?: StyleProp<TextStyle>;
  valueTextStyle?: StyleProp<TextStyle>;
}
