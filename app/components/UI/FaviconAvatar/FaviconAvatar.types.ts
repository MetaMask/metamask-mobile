import { ImageStyle } from 'react-native';
import { BaseAvatarProps } from '../../../component-library/components/BaseAvatar/BaseAvatar.types';

export interface FaviconAvatarProps extends BaseAvatarProps {
  imageUrl: string;
}

export interface FavIconStylesheet {
  image: ImageStyle;
}
