import { ViewProps } from 'react-native';

export enum BaseAvatarSize {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

export interface BaseAvatarProps extends ViewProps {
  size: BaseAvatarSize;
}

export type BaseAvatarStyleSheetVars = Pick<BaseAvatarProps, 'size' | 'style'>;
