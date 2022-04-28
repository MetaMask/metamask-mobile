import { ViewProps, ViewStyle } from 'react-native';

export enum AvatarSize {
  Small = 24,
  Medium = 32,
  Large = 40,
  ExtraLarge = 48,
}

export interface BaseAvatarProps extends ViewProps {
  size: AvatarSize;
  //TODO: remove any annotation
  style?: any;
}

export interface BaseAvatarStyleSheet {
  container: ViewStyle;
}
