import { ViewProps, ViewStyle } from 'react-native';

export enum AvatarSize {
  Xs = 16,
  Sm = 24,
  Md = 32,
  Lg = 40,
  Xl = 48,
}

export interface BaseAvatarProps extends ViewProps {
  size: AvatarSize;
  //TODO: remove any annotation
  style?: any;
}

export interface BaseAvatarStyleSheet {
  container: ViewStyle;
}
